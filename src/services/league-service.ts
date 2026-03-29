/**
 * League data service — league metadata, seasons, members, and teams.
 */

import { fetchCachedDocument } from '@@/src/utils/api-client';
import type {
    TrackInfoDirectory,
    LeagueSeasons,
    BlockedSeasons,
    ActiveLeagueSchedule,
    SeasonSimsessionIndex,
    LeagueSeasonSessions,
    MembersData,
    CuratedLeagueTeamsInfo,
    CuratedTrackDisplayhInfo,
} from '@@/lplib/endpoint-types/iracing-endpoints';

export async function getLeagueSeasons(
    league: string
): Promise<LeagueSeasons | null> {
    const namespace = 'ldata-irweb';
    const type = 'leagueSeasons';
    return await fetchCachedDocument<LeagueSeasons>({
        namespace,
        type,
        league,
    });
}

export async function getCuratedBlockedSeasons(): Promise<BlockedSeasons | null> {
    const namespace = 'ldata-irweb';
    const type = 'blockedSeasons';
    return await fetchCachedDocument<BlockedSeasons>({ namespace, type });
}

export async function getMembersData(
    league: string,
    season: string
): Promise<MembersData | null> {
    const namespace = 'ldata-irweb';
    const type = 'membersData';
    return await fetchCachedDocument<MembersData>({
        namespace,
        type,
        league,
        season,
    });
}

export async function getLeagueSimsessionIndex(
    league: string
): Promise<SeasonSimsessionIndex[] | null> {
    const namespace = 'ldata-rsltsts';
    const type = 'leagueSimsessionIndex';
    let ret = await fetchCachedDocument<SeasonSimsessionIndex[]>({
        namespace,
        type,
        league,
    });

    // TODO: move to backend
    if (ret) {
        for (let season of ret) {
            season.sessions = season.sessions.filter((session) => {
                let hasRace = session.simsessions.reduce(
                    (p, c) => p || c.type === 'race',
                    false
                );
                return hasRace;
            });
        }
    }

    return ret;
}

export async function getSeasonSimsessionIndex(
    league: string
): Promise<SeasonSimsessionIndex[] | null> {
    const namespace = 'ldata-rsltsts';
    const type = 'leagueSimsessionIndex';
    return await fetchCachedDocument<SeasonSimsessionIndex[]>({
        namespace,
        type,
        league,
    });
}

export async function getLeagueSeasonSessions(
    league: string,
    season: string
): Promise<LeagueSeasonSessions | null> {
    const namespace = 'ldata-irweb';
    const type = 'leagueSeasonSessions';
    let ret = await fetchCachedDocument<LeagueSeasonSessions>({
        namespace,
        type,
        league,
        season,
    });

    console.log(
        `[DEBUG:getLeagueSeasonSessions] raw response for league=${league} season=${season}:`,
        ret
            ? {
                  success: ret.success,
                  league_id: ret.league_id,
                  season_id: ret.season_id,
                  sessionCount: ret.sessions?.length ?? 'NO .sessions',
                  firstSession: ret.sessions?.[0]
                      ? {
                            subsession_id:
                                ret.sessions[0].subsession_id,
                            session_id: ret.sessions[0].session_id,
                            track: ret.sessions[0].track,
                            launch_at: ret.sessions[0].launch_at,
                            has_results: ret.sessions[0].has_results,
                        }
                      : 'EMPTY',
                  sessionKeys: ret.sessions?.[0]
                      ? Object.keys(ret.sessions[0])
                      : [],
              }
            : 'NULL RESPONSE'
    );

    // TODO: move this to the backend
    if (ret) {
        let ss = await getLeagueSimsessionIndex(league);

        console.log(
            `[DEBUG:getLeagueSeasonSessions] simsessionIndex for league=${league}:`,
            ss
                ? {
                      seasonCount: ss.length,
                      seasons: ss.map((s) => ({
                          season_id: s.season_id,
                          sessionCount: s.sessions?.length ?? 0,
                      })),
                  }
                : 'NULL'
        );

        let season_ = ss?.find(
            (v) => v.season_id.toString() === season
        );

        console.log(
            `[DEBUG:getLeagueSeasonSessions] matched season index for season=${season}:`,
            season_
                ? {
                      season_id: season_.season_id,
                      sessionCount: season_.sessions?.length ?? 0,
                      firstSession: season_.sessions?.[0] ?? 'EMPTY',
                  }
                : 'NO MATCH'
        );

        const preFilterCount = ret.sessions.length;
        ret.sessions = ret.sessions.filter((v) => {
            // Keep any session that has a subsession_id (i.e. it
            // actually ran) even when the simsession index hasn't
            // caught up yet.
            if (v.subsession_id) {
                let simsessions =
                    season_?.sessions.find(
                        (ses) =>
                            ses.subsession_id ===
                            v.subsession_id
                    )?.simsessions || [];
                let hasRace = simsessions.reduce((p, c) => {
                    return p || c.type === 'race';
                }, false);

                if (!hasRace) {
                    console.log(
                        `[DEBUG:getLeagueSeasonSessions] KEEPING subsession_id=${v.subsession_id} despite no race simsession (relaxed filter):`,
                        {
                            simsessionsFound: simsessions.length,
                            simsessions,
                        }
                    );
                }

                return true;
            }

            return false;
        });

        console.log(
            `[DEBUG:getLeagueSeasonSessions] filter result: ${preFilterCount} -> ${ret.sessions.length} sessions`
        );
    }

    return ret;
}

export async function getTrackInfoDirectory(
    league: string
): Promise<TrackInfoDirectory | null> {
    const namespace = 'ldata-rsltsts';
    const type = 'trackInfoDirectory';
    return await fetchCachedDocument<TrackInfoDirectory>({
        namespace,
        type,
        league,
    });
}

export async function getCuratedLeagueTeamsInfo(
    league: string
): Promise<CuratedLeagueTeamsInfo | null> {
    const namespace = 'ldata-usrcfg';
    const type = 'leagueTeamsInfo';
    return await fetchCachedDocument<CuratedLeagueTeamsInfo>({
        namespace,
        type,
        league,
    });
}

export async function getCuratedTrackDisplayInfo(): Promise<CuratedTrackDisplayhInfo | null> {
    const namespace = 'ldata-usrcfg';
    const type = 'trackDisplayInfo';
    return await fetchCachedDocument<CuratedTrackDisplayhInfo>({
        namespace,
        type,
    });
}

export async function getCuratedActiveLeagueSchedule(): Promise<ActiveLeagueSchedule | null> {
    const namespace = 'ldata-usrcfg';
    const type = 'activeLeagueSchedule';
    return await fetchCachedDocument<ActiveLeagueSchedule>({
        namespace,
        type,
    });
}

export interface LeagueRoster {
    roster: {
        cust_id: number;
        car_number: string;
        display_name: string;
        [key: string]: unknown;
    }[];
}

export async function getLeagueRoster(
    league: string
): Promise<LeagueRoster | null> {
    const namespace = 'ldata-irweb';
    const type = 'leagueRoster';
    return await fetchCachedDocument<LeagueRoster>({
        namespace,
        type,
        league,
    });
}

export interface DefaultLeagueContext {
    league_id: number;
    season_id: number;
    subsession_id: number;
    [key: string]: unknown;
}

export async function defLgSeasSubCtx(
    league: string = '',
    season: string = '',
    subsession: string = ''
): Promise<DefaultLeagueContext | null> {
    const namespace = 'ldata-usrcfg';
    const type = 'defLgSeasSubCtx';
    return await fetchCachedDocument<DefaultLeagueContext>({
        namespace,
        type,
        league,
        season,
        subsession,
    });
}
