/**
 * Server-side renderer for the home page (no `m=` mode).
 *
 * The bare `/` URL — and any `/?league=...&season=...` permutation
 * without an `m` — surfaces a league's upcoming schedule. The card
 * shows the league name as the headline, the next race as the
 * subtitle, and the next 3-4 events as body rows.
 *
 * When the curated active-league schedule is unreachable (or the
 * league/season can't be resolved), the card falls back to a brand
 * card so the unfurl still produces something credible.
 */

import type { H3Event } from 'h3';
import {
    fetchActiveLeagueSchedule,
    fetchTrackInfoDirectory,
    resolveLgSeasSubCtx,
} from './og-data';
import {
    type OgPayload,
    buildOgUrls,
    renderCardShell,
    renderBodyRow,
    renderEmptyBody,
    clampLine,
} from './og-render-shared';

interface HomeCardData {
    leagueName: string;
    seasonLabel: string;
    nextRace: { trackName: string; date: string } | null;
    upcoming: { trackName: string; date: string }[];
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

async function fetchHomeCardData(
    event: H3Event,
    query: Record<string, string>
): Promise<HomeCardData | null> {
    const ctx = await resolveLgSeasSubCtx(event, query);

    const schedule = await fetchActiveLeagueSchedule(event);
    if (!schedule) return null;

    // Prefer the broker-resolved league/season; only fall back to the
    // first-league / last-season heuristic if the broker is unreachable
    // and the URL didn't carry hints either.
    const leagueInfo =
        schedule.leagues.find((l) => l.league_id.toString() === ctx.league) ||
        schedule.leagues[0];
    if (!leagueInfo) return null;

    const seasonInfo =
        leagueInfo.seasons.find((s) => s.season_id.toString() === ctx.season) ||
        leagueInfo.seasons[leagueInfo.seasons.length - 1];
    if (!seasonInfo) {
        return {
            leagueName: leagueInfo.name,
            seasonLabel: '',
            nextRace: null,
            upcoming: [],
        };
    }

    // Track display names live in the per-league track info directory.
    // It's a small lookup table, so resolving names is cheap.
    const trackInfo = await fetchTrackInfoDirectory(
        event,
        leagueInfo.league_id.toString()
    );
    const trackName = (trackId: number): string =>
        trackInfo?.track_display?.[trackId.toString()] || `Track ${trackId}`;

    const now = Date.now();
    const upcoming = seasonInfo.events
        .filter((e) => new Date(e.time).getTime() > now)
        .slice(0, 4)
        .map((e) => ({
            trackName: trackName(e.track_id),
            date: formatRaceDate(e.time),
        }));

    return {
        leagueName: leagueInfo.name,
        seasonLabel: `Season ${seasonInfo.season_id}`,
        nextRace: upcoming[0] || null,
        upcoming,
    };
}

export async function buildHomeOgPayload(
    event: H3Event,
    query: Record<string, string>
): Promise<OgPayload> {
    const { ogUrl, imageUrl } = buildOgUrls(event, query);
    const data = await fetchHomeCardData(event, query);

    if (!data) {
        return {
            title: 'LEAP — Live Event Analysis and Performance',
            description:
                'Sim racing analytics for iRacing leagues — results, standings, charts, and event analysis.',
            ogUrl,
            imageUrl,
        };
    }

    const next = data.nextRace
        ? `${data.nextRace.trackName} · ${data.nextRace.date}`
        : 'No upcoming races scheduled';
    return {
        title: `${data.leagueName} — ${data.seasonLabel}`.trim(),
        description: `Next race: ${next}`,
        ogUrl,
        imageUrl,
    };
}

export async function renderHomeCardSvg(
    event: H3Event,
    query: Record<string, string>
): Promise<string> {
    const data = await fetchHomeCardData(event, query);

    const title = data?.leagueName || 'LEAP';
    const subtitle = data
        ? data.nextRace
            ? `${data.seasonLabel} · Next race: ${clampLine(
                  data.nextRace.trackName,
                  40
              )} · ${data.nextRace.date}`
            : `${data.seasonLabel} · No upcoming races`
        : 'Live Event Analysis and Performance';

    const bodySvg =
        data && data.upcoming.length > 0
            ? data.upcoming
                  .map((event_, i) =>
                      renderBodyRow({
                          y: 240 + i * 58,
                          label: event_.trackName,
                          valueRight: event_.date,
                          labelMax: 36,
                      })
                  )
                  .join('\n')
            : renderEmptyBody('Open in LEAP to see the schedule');

    return renderCardShell({
        eyebrow: 'LEAP · LEAGUE HOME',
        title,
        subtitle,
        bodySvg,
    });
}
