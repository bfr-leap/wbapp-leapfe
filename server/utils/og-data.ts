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
 * Resolve a (league_id, season_id) to its human-readable league name and
 * season-id label. Falls back to the raw IDs so the card always has
 * *something* to show even if the curated schedule is unreachable.
 */
export async function resolveLeagueSeasonLabel(
    event: H3Event,
    league: string,
    season: string
): Promise<{ leagueName: string; seasonLabel: string }> {
    const schedule = await fetchActiveLeagueSchedule(event);
    const leagueInfo = schedule?.leagues.find(
        (l) => l.league_id.toString() === league
    );
    const leagueName = leagueInfo?.name || `League ${league || '—'}`;
    const seasonLabel = season ? `Season ${season}` : 'Season —';
    return { leagueName, seasonLabel };
}
