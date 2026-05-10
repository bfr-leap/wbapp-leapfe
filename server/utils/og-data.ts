/**
 * Server-side data accessors for the OG preview path.
 *
 * These mirror a subset of `src/services/*` but call the local Nitro
 * `/api/fetch-document` endpoint directly via `$fetch`, instead of going
 * through the browser-oriented `api-client.ts`. Reasons:
 *   1. `api-client.ts` requires `setApiBaseURL` / `setAuth` initialization
 *      that's wired up in `app.vue` — not from a server middleware.
 *   2. The api-client maintains a global cache shared with the SPA. Bot
 *      requests should not pollute (or share) that cache.
 *   3. `$fetch` resolves internal Nitro routes with no extra config and
 *      handles the auth middleware path the same way an anonymous SPA
 *      request would.
 */

import type { H3Event } from 'h3';
import type {
    SimsessionResults,
    MembersData,
    SeasonSimsessionIndex,
    M_Member,
    DriverStatsMap,
    CuratedLeagueTeamsInfo,
    TrackStats,
    ActiveLeagueSchedule,
    LeagueSeasons,
    StewardRuling,
    TrackInfoDirectory,
} from '@@/lplib/endpoint-types/iracing-endpoints';
import { getRequestOrigin } from './og-bot';

async function fetchDoc<T>(
    event: H3Event,
    params: Record<string, string>
): Promise<T | null> {
    try {
        const res = await $fetch<{ doc: T | null }>('/api/fetch-document', {
            baseURL: getRequestOrigin(event),
            query: params,
        });
        return res?.doc ?? null;
    } catch (e) {
        console.warn('[og-data] fetchDoc failed', params, e);
        return null;
    }
}

export async function fetchSimsessionResults(
    event: H3Event,
    subsession: string,
    simsession: string
): Promise<SimsessionResults | null> {
    return fetchDoc<SimsessionResults>(event, {
        namespace: 'ldata-rsltsts',
        type: 'simSessionResults',
        subsession,
        simsession,
    });
}

export async function fetchMembersData(
    event: H3Event,
    league: string,
    season: string
): Promise<MembersData | null> {
    return fetchDoc<MembersData>(event, {
        namespace: 'ldata-irweb',
        type: 'membersData',
        league,
        season,
    });
}

export async function fetchLeagueSimsessionIndex(
    event: H3Event,
    league: string
): Promise<SeasonSimsessionIndex[] | null> {
    return fetchDoc<SeasonSimsessionIndex[]>(event, {
        namespace: 'ldata-rsltsts',
        type: 'leagueSimsessionIndex',
        league,
    });
}

/**
 * Resolve the human-readable session title for a (league, subsession)
 * pair by walking the league's simsession index. Returns the subsession
 * id as a fallback when the title can't be located so the OG card always
 * has *some* identifier to display.
 */
export async function resolveSubsessionName(
    event: H3Event,
    league: string,
    subsessionId: string
): Promise<string> {
    const index = await fetchLeagueSimsessionIndex(event, league);
    if (!index) return `Subsession ${subsessionId}`;
    for (const season of index) {
        for (const session of season.sessions) {
            if (session.subsession_id.toString() === subsessionId) {
                return session.session_title || `Subsession ${subsessionId}`;
            }
        }
    }
    return `Subsession ${subsessionId}`;
}

/**
 * Build a cust_id → display_name lookup from `MembersData`. Anonymous
 * cust_ids that don't appear in the roster get a `#<cust_id>` fallback
 * so the card never shows blank rows.
 */
export function buildNameLookup(
    members: MembersData | null
): (custId: number) => string {
    const map = new Map<number, string>();
    for (const m of members?.members || []) {
        map.set(m.cust_id, m.display_name);
    }
    return (custId: number) => map.get(custId) || `#${custId}`;
}

// ---------------------------------------------------------------------------
// Fetchers added for non-results modes
// ---------------------------------------------------------------------------

export async function fetchSingleMemberData(
    event: H3Event,
    custId: string
): Promise<M_Member | null> {
    return fetchDoc<M_Member>(event, {
        namespace: 'ldata-rsltsts',
        type: 'singleMemberData',
        custId,
    });
}

export async function fetchLeagueDriverStats(
    event: H3Event,
    league: string
): Promise<{ [seasonId: number]: DriverStatsMap } | null> {
    return fetchDoc<{ [seasonId: number]: DriverStatsMap }>(event, {
        namespace: 'ldata-rsltsts',
        type: 'leagueDriverStats',
        league,
    });
}

export async function fetchCuratedLeagueTeamsInfo(
    event: H3Event,
    league: string
): Promise<CuratedLeagueTeamsInfo | null> {
    return fetchDoc<CuratedLeagueTeamsInfo>(event, {
        namespace: 'ldata-usrcfg',
        type: 'leagueTeamsInfo',
        league,
    });
}

export async function fetchTrackStats(
    event: H3Event,
    league: string,
    car: string,
    track: string
): Promise<TrackStats | null> {
    return fetchDoc<TrackStats>(event, {
        namespace: 'ldata-rsltsts',
        type: 'trackResults',
        league,
        car,
        track,
    });
}

export async function fetchTrackInfoDirectory(
    event: H3Event,
    league: string
): Promise<TrackInfoDirectory | null> {
    return fetchDoc<TrackInfoDirectory>(event, {
        namespace: 'ldata-rsltsts',
        type: 'trackInfoDirectory',
        league,
    });
}

export async function fetchActiveLeagueSchedule(
    event: H3Event
): Promise<ActiveLeagueSchedule | null> {
    return fetchDoc<ActiveLeagueSchedule>(event, {
        namespace: 'ldata-usrcfg',
        type: 'activeLeagueSchedule',
    });
}

/**
 * Mirror the SPA's anonymous default-context resolution: call the
 * broker's `defLgSeasSubCtx` document with whatever (possibly empty)
 * query params the visitor provided and let it return the canonical
 * (league_id, season_id, subsession_id) triple. The bare `/` URL
 * relies on this to land on the actively curated league/season instead
 * of the alphabetically-first one in the schedule index — the SPA
 * does the same in `pages/index.vue` via `defLgSeasSubCtx()`.
 */
export interface DefaultLeagueContext {
    league_id: number;
    season_id: number;
    subsession_id: number;
}

export async function fetchDefLgSeasSubCtx(
    event: H3Event,
    league: string,
    season: string,
    subsession: string
): Promise<DefaultLeagueContext | null> {
    return fetchDoc<DefaultLeagueContext>(event, {
        namespace: 'ldata-usrcfg',
        type: 'defLgSeasSubCtx',
        league,
        season,
        subsession,
    });
}

export interface ResolvedContext {
    league: string;
    season: string;
    subsession: string;
}

/**
 * The OG counterpart of `pages/index.vue`'s top-level
 * `defLgSeasSubCtx(...)` call: every shareable URL on the SPA — bare or
 * with an `m=...` mode — passes through that resolver before any view
 * data is fetched, so a link with no `league`/`season` lands on the
 * curated default rather than the alphabetically-first index entry.
 * Per-mode OG renderers should call this once at the top of their data
 * fetch and use the returned IDs in place of the raw query strings.
 *
 * If the broker is unreachable, the URL hints come back unchanged.
 * That preserves the prior behavior (hard-fail on missing required
 * params) instead of silently rendering a confusing default.
 */
export async function resolveLgSeasSubCtx(
    event: H3Event,
    query: Record<string, string>
): Promise<ResolvedContext> {
    const leagueQ = query.league || '';
    const seasonQ = query.season || '';
    const subsessionQ = query.subsession || '';
    const ctx = await fetchDefLgSeasSubCtx(
        event,
        leagueQ,
        seasonQ,
        subsessionQ
    );
    return {
        league: ctx?.league_id ? ctx.league_id.toString() : leagueQ,
        season: ctx?.season_id ? ctx.season_id.toString() : seasonQ,
        subsession: ctx?.subsession_id
            ? ctx.subsession_id.toString()
            : subsessionQ,
    };
}

export async function fetchRulings(
    event: H3Event,
    league: string,
    season: string
): Promise<StewardRuling[] | null> {
    return fetchDoc<StewardRuling[]>(event, {
        namespace: 'ldata-stwdcfg',
        type: 'getRulings',
        league,
        season,
    });
}

/**
 * Per-league listing of seasons with their human-readable names. The
 * SPA reads this same document to render season chips and dropdowns;
 * the OG path uses it to print "Season X" rather than "Season 131502"
 * in card subtitles.
 */
export async function fetchLeagueSeasons(
    event: H3Event,
    league: string
): Promise<LeagueSeasons | null> {
    return fetchDoc<LeagueSeasons>(event, {
        namespace: 'ldata-irweb',
        type: 'leagueSeasons',
        league,
    });
}

/**
 * Resolve a (league_id, season_id) to its human-readable league name
 * and season name. Falls back to the raw IDs so the card always has
 * *something* to show even if the curated schedule or the per-league
 * seasons document is unreachable.
 *
 * Two documents back this: `activeLeagueSchedule` carries the league's
 * display name, and `leagueSeasons` carries each season's display
 * name. The schedule index doesn't include `season_name` — that's why
 * the first version of this function fell through to "Season {id}".
 */
export async function resolveLeagueSeasonLabel(
    event: H3Event,
    league: string,
    season: string
): Promise<{ leagueName: string; seasonLabel: string }> {
    const [schedule, seasons] = await Promise.all([
        fetchActiveLeagueSchedule(event),
        league ? fetchLeagueSeasons(event, league) : Promise.resolve(null),
    ]);
    const leagueInfo = schedule?.leagues.find(
        (l) => l.league_id.toString() === league
    );
    const leagueName = leagueInfo?.name || `League ${league || '—'}`;
    const seasonInfo = seasons?.seasons.find(
        (s) => s.season_id.toString() === season
    );
    const seasonLabel = seasonInfo?.season_name
        ? seasonInfo.season_name
        : season
        ? `Season ${season}`
        : 'Season —';
    return { leagueName, seasonLabel };
}
