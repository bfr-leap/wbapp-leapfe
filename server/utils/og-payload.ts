/**
 * Per-mode payload assembler for OG cards.
 *
 * Replaces the eight `og-render-*.ts` files we used to maintain (one
 * per `m=` mode). Each builder returns the same shape — meta-tag
 * title/description plus the props that feed `components/OgImage/Card.vue`
 * — so the page-level dispatcher only needs to pick the right builder.
 *
 * `nuxt-og-image` calls this from the page setup during SSR; the props
 * get embedded as JSON-encoded query state on the resolved og:image
 * URL, the module re-renders the component with those props for any
 * unfurler that fetches the URL, and Discord/Slack/etc. cache the
 * resulting PNG as usual.
 */

import type { H3Event } from 'h3';
import type {
    SSR_ResultsEntry,
    DriverStats,
} from '@@/lplib/endpoint-types/iracing-endpoints';
import {
    buildNameLookup,
    fetchActiveLeagueSchedule,
    fetchCuratedLeagueTeamsInfo,
    fetchLeagueDriverStats,
    fetchLeagueSeasons,
    fetchMembersData,
    fetchRulings,
    fetchSimsessionResults,
    fetchSingleMemberData,
    fetchTrackInfoDirectory,
    fetchTrackStats,
    resolveLeagueSeasonLabel,
    resolveLgSeasSubCtx,
    resolveSubsessionName,
} from './og-data';

// -----------------------------------------------------------------------------
// Card prop shape — must match components/OgImage/Card.vue
// -----------------------------------------------------------------------------

interface PodiumBadge {
    text: string;
    fill: string;
    textFill: string;
}

interface CardRow {
    label: string;
    valueLeft?: string;
    valueRight?: string;
    badge?: PodiumBadge;
}

interface CardGridCell {
    label: string;
    value: string;
}

type CardBody =
    | { type: 'rows'; rows: CardRow[] }
    | { type: 'grid'; cells: CardGridCell[] }
    | { type: 'empty'; message: string };

export interface CardProps {
    eyebrow: string;
    title: string;
    subtitle: string;
    body: CardBody;
}

export interface OgPayload {
    metaTitle: string;
    metaDescription: string;
    card: CardProps;
}

function podiumBadge(position: number): {
    fill: string;
    textFill: string;
} {
    if (position === 1) return { fill: '#f6c244', textFill: '#0b0d10' };
    if (position === 2) return { fill: '#c4cdd5', textFill: '#0b0d10' };
    if (position === 3) return { fill: '#cd7f32', textFill: '#0b0d10' };
    return { fill: '#1f2733', textFill: '#e6edf3' };
}

function clampLine(s: string, max: number): string {
    if (!s) return '';
    return s.length <= max ? s : s.slice(0, max - 1) + '…';
}

function formatRaceDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });
}

// -----------------------------------------------------------------------------
// Brand fallback
// -----------------------------------------------------------------------------

function brandPayload(): OgPayload {
    return {
        metaTitle: 'LEAP — Live Event Analysis and Performance',
        metaDescription:
            'Sim racing analytics for iRacing leagues — results, standings, charts, and event analysis.',
        card: {
            eyebrow: 'LEAP',
            title: 'Live Event Analysis and Performance',
            subtitle: 'Sim racing analytics for iRacing leagues',
            body: { type: 'empty', message: 'Open in LEAP for the latest' },
        },
    };
}

// -----------------------------------------------------------------------------
// m=''  (home / league summary)
// -----------------------------------------------------------------------------

async function buildHome(
    event: H3Event,
    query: Record<string, string>
): Promise<OgPayload> {
    const ctx = await resolveLgSeasSubCtx(event, query);
    const schedule = await fetchActiveLeagueSchedule(event);
    if (!schedule) return brandPayload();

    const leagueInfo =
        schedule.leagues.find((l) => l.league_id.toString() === ctx.league) ||
        schedule.leagues[0];
    if (!leagueInfo) return brandPayload();

    const seasonInfo =
        leagueInfo.seasons.find((s) => s.season_id.toString() === ctx.season) ||
        leagueInfo.seasons[leagueInfo.seasons.length - 1];

    const leagueId = leagueInfo.league_id.toString();
    const [trackInfo, seasons] = await Promise.all([
        fetchTrackInfoDirectory(event, leagueId),
        fetchLeagueSeasons(event, leagueId),
    ]);
    const trackName = (trackId: number) =>
        trackInfo?.track_display?.[trackId.toString()] || `Track ${trackId}`;

    const seasonName = seasons?.seasons.find(
        (s) => s.season_id === seasonInfo?.season_id
    )?.season_name;
    const seasonLabel = seasonInfo
        ? seasonName || `Season ${seasonInfo.season_id}`
        : '';

    const now = Date.now();
    const upcoming = (seasonInfo?.events || [])
        .filter((e) => new Date(e.time).getTime() > now)
        .slice(0, 4)
        .map((e) => ({
            trackName: trackName(e.track_id),
            date: formatRaceDate(e.time),
        }));

    const nextRace = upcoming[0];
    const subtitle = nextRace
        ? `${seasonLabel} · Next race: ${clampLine(nextRace.trackName, 40)} · ${
              nextRace.date
          }`
        : `${seasonLabel}${seasonLabel ? ' · ' : ''}No upcoming races`;

    return {
        metaTitle: `${leagueInfo.name}${
            seasonLabel ? ` — ${seasonLabel}` : ''
        }`,
        metaDescription: nextRace
            ? `Next race: ${nextRace.trackName} · ${nextRace.date}`
            : 'No upcoming races scheduled',
        card: {
            eyebrow: 'LEAP · LEAGUE HOME',
            title: leagueInfo.name,
            subtitle,
            body:
                upcoming.length > 0
                    ? {
                          type: 'rows',
                          rows: upcoming.map((e) => ({
                              label: e.trackName,
                              valueRight: e.date,
                          })),
                      }
                    : {
                          type: 'empty',
                          message: 'Open in LEAP to see the schedule',
                      },
        },
    };
}

// -----------------------------------------------------------------------------
// m=results
// -----------------------------------------------------------------------------

function formatGap(entry: SSR_ResultsEntry): string {
    if (entry.position === 1) return 'leader';
    if (typeof entry.interval !== 'number' || entry.interval < 0) return '—';
    const seconds = entry.interval / 10000;
    if (seconds < 60) return `+${seconds.toFixed(3)}s`;
    const minutes = Math.floor(seconds / 60);
    const remSec = (seconds - minutes * 60).toFixed(3);
    return `+${minutes}:${remSec.padStart(6, '0')}`;
}

async function buildResults(
    event: H3Event,
    query: Record<string, string>
): Promise<OgPayload> {
    const ctx = await resolveLgSeasSubCtx(event, query);
    const simsessionId = query.simsession || '0';
    if (!ctx.subsession) return brandPayload();

    const [simResults, members, sessionName] = await Promise.all([
        fetchSimsessionResults(event, ctx.subsession, simsessionId),
        ctx.league && ctx.season
            ? fetchMembersData(event, ctx.league, ctx.season)
            : Promise.resolve(null),
        ctx.league
            ? resolveSubsessionName(event, ctx.league, ctx.subsession)
            : Promise.resolve(`Subsession ${ctx.subsession}`),
    ]);
    if (!simResults) return brandPayload();

    const lookup = buildNameLookup(members);
    // Cap at 4 rows: the Card body fits 5 rows when the title is a
    // single line, but long titles (e.g. "Watkins Glen International
    // - Super Formula SF23 - Honda") wrap to 2 lines and the 5th row
    // clips the footer. 4 rows always fits regardless of title height.
    const top = [...(simResults.results || [])]
        .filter((r) => typeof r.position === 'number' && r.position >= 1)
        .sort((a, b) => a.position - b.position)
        .slice(0, 4);

    const rows: CardRow[] = top.map((r) => ({
        label: lookup(r.cust_id),
        valueLeft: formatGap(r),
        valueRight: `${r.points || 0} pts`,
        badge: { text: String(r.position), ...podiumBadge(r.position) },
    }));

    const podium = top
        .slice(0, 3)
        .map((r) => `${r.position}. ${lookup(r.cust_id)}`)
        .join(' · ');

    return {
        metaTitle: `${sessionName} — Race Results`,
        metaDescription: podium
            ? `Top finishers: ${podium}`
            : 'Race results and analysis.',
        card: {
            eyebrow: 'LEAP · RACE RESULTS',
            title: sessionName,
            subtitle: `Subsession ${ctx.subsession} · Simsession ${simsessionId}`,
            body:
                rows.length > 0
                    ? { type: 'rows', rows }
                    : { type: 'empty', message: 'Results not yet available' },
        },
    };
}

// -----------------------------------------------------------------------------
// m=standings
// -----------------------------------------------------------------------------

async function buildStandings(
    event: H3Event,
    query: Record<string, string>
): Promise<OgPayload> {
    const ctx = await resolveLgSeasSubCtx(event, query);
    if (!ctx.league || !ctx.season) return brandPayload();

    const [members, allStats, label] = await Promise.all([
        fetchMembersData(event, ctx.league, ctx.season),
        fetchLeagueDriverStats(event, ctx.league),
        resolveLeagueSeasonLabel(event, ctx.league, ctx.season),
    ]);

    const seasonStats = allStats?.[Number(ctx.season)];
    const ranked =
        members && seasonStats
            ? [...members.members]
                  .map((m) => ({
                      name: m.display_name,
                      points: seasonStats[m.cust_id]?.power_points ?? 0,
                  }))
                  .filter((r) => r.points > 0)
                  .sort((a, b) => b.points - a.points)
                  .slice(0, 4)
            : [];

    const rows: CardRow[] = ranked.map((r, i) => ({
        label: r.name,
        valueRight: `${r.points} pts`,
        badge: { text: String(i + 1), ...podiumBadge(i + 1) },
    }));

    const top3 = ranked
        .slice(0, 3)
        .map((r, i) => `${i + 1}. ${r.name}`)
        .join(' · ');

    return {
        metaTitle: `${label.leagueName} — Standings`,
        metaDescription:
            ranked.length > 0
                ? `${label.seasonLabel} · ${top3}`
                : 'Championship standings — sorted by power points.',
        card: {
            eyebrow: 'LEAP · DRIVER STANDINGS',
            title: label.leagueName,
            subtitle: label.seasonLabel,
            body:
                rows.length > 0
                    ? { type: 'rows', rows }
                    : {
                          type: 'empty',
                          message: 'Standings not yet available',
                      },
        },
    };
}

// -----------------------------------------------------------------------------
// m=driver
// -----------------------------------------------------------------------------

function sumStats(
    s: DriverStats | undefined,
    into: { started: number; wins: number; podiums: number; top10: number }
) {
    if (!s) return;
    into.started += s.started || 0;
    into.wins += s.wins || 0;
    into.podiums += s.podiums || 0;
    into.top10 += s.top_10 || 0;
}

async function buildDriver(
    event: H3Event,
    query: Record<string, string>
): Promise<OgPayload> {
    const driver = query.driver || '';
    if (!driver) return brandPayload();
    const ctx = await resolveLgSeasSubCtx(event, query);

    const [member, allStats, teamsInfo, label] = await Promise.all([
        fetchSingleMemberData(event, driver),
        ctx.league
            ? fetchLeagueDriverStats(event, ctx.league)
            : Promise.resolve(null),
        ctx.league
            ? fetchCuratedLeagueTeamsInfo(event, ctx.league)
            : Promise.resolve(null),
        resolveLeagueSeasonLabel(event, ctx.league, ''),
    ]);
    if (!member) return brandPayload();

    const totals = { started: 0, wins: 0, podiums: 0, top10: 0 };
    if (allStats) {
        for (const seasonStats of Object.values(allStats)) {
            sumStats(seasonStats[Number(driver)], totals);
        }
    }

    let teamName: string | null = null;
    if (teamsInfo) {
        const sortedSeasons = [...teamsInfo.seasons].sort(
            (a, b) => b.season_id - a.season_id
        );
        for (const s of sortedSeasons) {
            const team = s.teams.find((t) =>
                t.team_members.includes(Number(driver))
            );
            if (team) {
                teamName = team.team_name;
                break;
            }
        }
    }

    return {
        metaTitle: `${member.display_name} — ${label.leagueName}`,
        metaDescription: `Started ${totals.started} · ${totals.wins} wins · ${
            totals.podiums
        } podiums${teamName ? ` · ${teamName}` : ''}`,
        card: {
            eyebrow: 'LEAP · DRIVER PROFILE',
            title: member.display_name,
            subtitle: teamName
                ? `${label.leagueName} · ${teamName}`
                : label.leagueName,
            body: {
                type: 'grid',
                cells: [
                    { label: 'Starts', value: String(totals.started) },
                    { label: 'Wins', value: String(totals.wins) },
                    { label: 'Podiums', value: String(totals.podiums) },
                    { label: 'Top 10s', value: String(totals.top10) },
                ],
            },
        },
    };
}

// -----------------------------------------------------------------------------
// m=team
// -----------------------------------------------------------------------------

async function buildTeam(
    event: H3Event,
    query: Record<string, string>
): Promise<OgPayload> {
    const teamId = query.team || '';
    if (!teamId) return brandPayload();
    const ctx = await resolveLgSeasSubCtx(event, query);
    if (!ctx.league) return brandPayload();

    const [teamsInfo, label] = await Promise.all([
        fetchCuratedLeagueTeamsInfo(event, ctx.league),
        resolveLeagueSeasonLabel(event, ctx.league, ''),
    ]);
    if (!teamsInfo) return brandPayload();

    const sortedSeasons = [...teamsInfo.seasons].sort(
        (a, b) => b.season_id - a.season_id
    );
    let team = null;
    for (const s of sortedSeasons) {
        const found = s.teams.find((t) => t.team_id.toString() === teamId);
        if (found) {
            team = found;
            break;
        }
    }
    if (!team) return brandPayload();

    const memberIds = team.team_members.slice(0, 6);
    const members = await Promise.all(
        memberIds.map((id) => fetchSingleMemberData(event, id.toString()))
    );
    const driverNames = members.map(
        (m, i) => m?.display_name || `#${memberIds[i]}`
    );

    return {
        metaTitle: `${team.team_name} — ${label.leagueName}`,
        metaDescription: `${driverNames.length} drivers · ${driverNames
            .slice(0, 3)
            .join(', ')}`,
        card: {
            eyebrow: 'LEAP · TEAM PROFILE',
            title: team.team_name,
            subtitle: `${label.leagueName} · ${driverNames.length} driver${
                driverNames.length === 1 ? '' : 's'
            }`,
            body: {
                type: 'rows',
                rows: driverNames.map((name) => ({ label: name })),
            },
        },
    };
}

// -----------------------------------------------------------------------------
// m=track
// -----------------------------------------------------------------------------

function extractFastestLaps(
    rows: { [name: string]: string }[] | undefined,
    keys: string[] | undefined
): { driver: string; time: string }[] {
    if (!rows) return [];
    const driverKey =
        (keys || []).find((k) => /driver|name/i.test(k)) || 'driver';
    const timeKey =
        (keys || []).find((k) => /lap.?time|^time$/i.test(k)) || 'time';
    return rows.slice(0, 4).map((r) => ({
        driver: r[driverKey] || '—',
        time: r[timeKey] || '—',
    }));
}

async function buildTrack(
    event: H3Event,
    query: Record<string, string>
): Promise<OgPayload> {
    const car = query.car || '';
    const track = query.track || '';
    if (!car || !track) return brandPayload();
    const ctx = await resolveLgSeasSubCtx(event, query);
    if (!ctx.league) return brandPayload();

    const [stats, info] = await Promise.all([
        fetchTrackStats(event, ctx.league, car, track),
        fetchTrackInfoDirectory(event, ctx.league),
    ]);
    if (!stats) return brandPayload();

    const trackName =
        info?.track_display?.[track] || stats.display_name || `Track ${track}`;
    const carName = info?.car_display?.[car] || `Car ${car}`;
    const leagueName = info?.league_name || `League ${ctx.league}`;
    const fastestLaps = extractFastestLaps(
        stats.fastest_race_lap?.rows,
        stats.fastest_race_lap?.keys
    );

    const rows: CardRow[] = fastestLaps.map((lap, i) => ({
        label: lap.driver,
        valueRight: lap.time,
        badge: { text: String(i + 1), ...podiumBadge(i + 1) },
    }));

    const top = fastestLaps[0];
    return {
        metaTitle: `${trackName} — ${carName}`,
        metaDescription: top
            ? `Fastest lap: ${top.driver} (${top.time}) · ${carName}`
            : `${carName} · ${leagueName}`,
        card: {
            eyebrow: 'LEAP · TRACK STATS',
            title: trackName,
            subtitle: `${carName} · ${leagueName}`,
            body:
                rows.length > 0
                    ? { type: 'rows', rows }
                    : { type: 'empty', message: 'No lap records yet' },
        },
    };
}

// -----------------------------------------------------------------------------
// m=season
// -----------------------------------------------------------------------------

async function buildSeason(
    event: H3Event,
    query: Record<string, string>
): Promise<OgPayload> {
    const ctx = await resolveLgSeasSubCtx(event, query);
    if (!ctx.league || !ctx.season) return brandPayload();

    const [schedule, trackInfo, label] = await Promise.all([
        fetchActiveLeagueSchedule(event),
        fetchTrackInfoDirectory(event, ctx.league),
        resolveLeagueSeasonLabel(event, ctx.league, ctx.season),
    ]);

    const leagueInfo = schedule?.leagues.find(
        (l) => l.league_id.toString() === ctx.league
    );
    const seasonInfo = leagueInfo?.seasons.find(
        (s) => s.season_id.toString() === ctx.season
    );

    const trackName = (trackId: number) =>
        trackInfo?.track_display?.[trackId.toString()] || `Track ${trackId}`;

    const now = Date.now();
    const upcoming = (seasonInfo?.events || [])
        .filter((e) => new Date(e.time).getTime() > now)
        .slice(0, 4);
    const events =
        upcoming.length > 0
            ? upcoming.map((e) => ({
                  trackName: trackName(e.track_id),
                  date: formatRaceDate(e.time),
                  isPast: false,
              }))
            : (seasonInfo?.events || [])
                  .filter((e) => new Date(e.time).getTime() <= now)
                  .slice(-4)
                  .map((e) => ({
                      trackName: trackName(e.track_id),
                      date: formatRaceDate(e.time),
                      isPast: true,
                  }));

    const peek = events
        .slice(0, 2)
        .map((e) => `${e.trackName} (${e.date})`)
        .join(' · ');

    return {
        metaTitle: `${label.leagueName} — ${label.seasonLabel}`,
        metaDescription: peek || 'Open in LEAP for the full schedule',
        card: {
            eyebrow: 'LEAP · SEASON PROFILE',
            title: label.leagueName,
            subtitle: `${label.seasonLabel}${
                events[0]?.isPast ? ' · Recent races' : ''
            }`,
            body:
                events.length > 0
                    ? {
                          type: 'rows',
                          rows: events.map((e) => ({
                              label: e.trackName,
                              valueRight: e.date,
                          })),
                      }
                    : {
                          type: 'empty',
                          message: 'Open in LEAP to see the schedule',
                      },
        },
    };
}

// -----------------------------------------------------------------------------
// m=rulings
// -----------------------------------------------------------------------------

async function buildRulings(
    event: H3Event,
    query: Record<string, string>
): Promise<OgPayload> {
    const ctx = await resolveLgSeasSubCtx(event, query);
    if (!ctx.league || !ctx.season) return brandPayload();

    const [rulings, members, label] = await Promise.all([
        fetchRulings(event, ctx.league, ctx.season),
        fetchMembersData(event, ctx.league, ctx.season),
        resolveLeagueSeasonLabel(event, ctx.league, ctx.season),
    ]);

    const list = Array.isArray(rulings) ? rulings : [];
    const sorted = [...list].sort((a, b) => {
        const ta = new Date(a.ruling_date).getTime() || 0;
        const tb = new Date(b.ruling_date).getTime() || 0;
        return tb - ta;
    });

    const lookup = buildNameLookup(members);
    const topRulings = sorted.slice(0, 4);
    // Fetch single-member data for any driver_id in the top rulings
    // that isn't on the season roster — matches the SPA's per-member
    // fallback in steward-rulings-model so the card never falls back
    // to a bare cust_id when a name is available.
    const missingIds = new Set<number>();
    for (const r of topRulings) {
        if (r.driver_name) continue;
        const id = typeof r.driver_id === 'number' ? r.driver_id : null;
        if (id != null && lookup(id) === `#${id}`) missingIds.add(id);
    }
    const fallbackNames = new Map<number, string>();
    if (missingIds.size > 0) {
        const fetched = await Promise.all(
            Array.from(missingIds).map((id) =>
                fetchSingleMemberData(event, id.toString()).then(
                    (m) => [id, m?.display_name] as const
                )
            )
        );
        for (const [id, name] of fetched) {
            if (name) fallbackNames.set(id, name);
        }
    }

    const resolveDriver = (r: typeof topRulings[number]): string => {
        if (r.driver_name) return r.driver_name;
        if (typeof r.driver_id === 'number') {
            const fromRoster = lookup(r.driver_id);
            if (fromRoster !== `#${r.driver_id}`) return fromRoster;
            const fromMember = fallbackNames.get(r.driver_id);
            if (fromMember) return fromMember;
        }
        if (r.discord_user_id) return r.discord_user_id;
        if (r.driver_id != null) return `Driver ${r.driver_id}`;
        return 'Unknown';
    };

    const recent = topRulings.map((r) => ({
        driver: resolveDriver(r),
        infraction: r.infraction || r.classification || 'Ruling',
    }));

    const recentNames = recent
        .slice(0, 3)
        .map((r) => r.driver)
        .join(', ');

    return {
        metaTitle: `${label.leagueName} — Rulings`,
        metaDescription: `${label.seasonLabel} · ${list.length} ruling${
            list.length === 1 ? '' : 's'
        }${recentNames ? ` · Recent: ${recentNames}` : ''}`,
        card: {
            eyebrow: 'LEAP · STEWARD RULINGS',
            title: label.leagueName,
            subtitle: `${label.seasonLabel} · ${list.length} ruling${
                list.length === 1 ? '' : 's'
            }`,
            body:
                recent.length > 0
                    ? {
                          type: 'rows',
                          rows: recent.map((r) => ({
                              label: r.driver,
                              valueLeft: r.infraction,
                          })),
                      }
                    : {
                          type: 'empty',
                          message: 'No rulings yet this season',
                      },
        },
    };
}

// -----------------------------------------------------------------------------
// Dispatcher
// -----------------------------------------------------------------------------

const BUILDERS: Record<
    string,
    (event: H3Event, query: Record<string, string>) => Promise<OgPayload>
> = {
    '': buildHome,
    results: buildResults,
    standings: buildStandings,
    driver: buildDriver,
    team: buildTeam,
    track: buildTrack,
    season: buildSeason,
    rulings: buildRulings,
};

export async function buildOgPayloadFromQuery(
    event: H3Event,
    query: Record<string, string>
): Promise<OgPayload> {
    const mode = query.m || '';
    const builder = BUILDERS[mode];
    if (!builder) return brandPayload();
    try {
        return await builder(event, query);
    } catch (e) {
        console.error('[og-payload] build failed for mode', mode, e);
        return brandPayload();
    }
}
