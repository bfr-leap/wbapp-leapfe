import {
    getLeagueSeasonSessions,
    getLeagueSimsessionIndex,
} from '@@/src/utils/fetch-util';
import type { SSI_Session } from 'lplib/endpoint-types/iracing-endpoints';

export interface PastEventCardsModel {
    pastRaces: {
        sessionId: string;
        simsessionId: string;
        trackId: string;
        date: string;
        isSelected: boolean;
    }[];
}

export function getDefaultPastEventCardsModel(): PastEventCardsModel {
    return { pastRaces: [] };
}

export async function getPastEventCardsModel(
    league: string,
    season: string
): Promise<PastEventCardsModel> {
    let ret: PastEventCardsModel = getDefaultPastEventCardsModel();

    if (!league || !season) {
        console.log(
            `[DEBUG:getPastEventCardsModel] early return — league="${league}" season="${season}"`
        );
        return ret;
    }

    let [leagueSeasonSessions, simsessionIndex] = await Promise.all([
        getLeagueSeasonSessions(league, season),
        getLeagueSimsessionIndex(league),
    ]);

    console.log(
        `[DEBUG:getPastEventCardsModel] leagueSeasonSessions:`,
        leagueSeasonSessions
            ? {
                  sessionCount:
                      leagueSeasonSessions.sessions?.length ??
                      'NO .sessions',
                  success: leagueSeasonSessions.success,
              }
            : 'NULL'
    );
    console.log(
        `[DEBUG:getPastEventCardsModel] simsessionIndex:`,
        simsessionIndex
            ? {
                  seasonCount: simsessionIndex.length,
                  seasonIds: simsessionIndex.map(
                      (s) => s.season_id
                  ),
              }
            : 'NULL'
    );

    let seasonIndex = simsessionIndex?.find(
        (s) => s.season_id.toString() === season
    );

    console.log(
        `[DEBUG:getPastEventCardsModel] seasonIndex match for season="${season}":`,
        seasonIndex
            ? {
                  season_id: seasonIndex.season_id,
                  sessionCount: seasonIndex.sessions?.length ?? 0,
              }
            : 'NO MATCH'
    );

    for (let session of leagueSeasonSessions?.sessions || []) {
        if (session?.subsession_id) {
            let ssiSession: SSI_Session | undefined =
                seasonIndex?.sessions.find(
                    (s) =>
                        s.subsession_id === session.subsession_id
                );
            let raceSimsession = ssiSession?.simsessions.find(
                (s) => s.type === 'race'
            );
            let simsessionId =
                raceSimsession?.simsession_id ??
                ssiSession?.simsessions[0]?.simsession_id;

            if (!ssiSession) {
                console.log(
                    `[DEBUG:getPastEventCardsModel] no ssiSession match for subsession_id=${session.subsession_id}`
                );
            }

            ret.pastRaces.push({
                trackId: session.track.track_id.toString(),
                date: session.launch_at,
                isSelected: false,
                sessionId:
                    session?.subsession_id?.toString() || '',
                simsessionId: simsessionId?.toString() || '',
            });
        } else {
            console.log(
                `[DEBUG:getPastEventCardsModel] session without subsession_id:`,
                {
                    session_id: session?.session_id,
                    launch_at: session?.launch_at,
                    track: session?.track,
                    keys: Object.keys(session || {}),
                }
            );
        }
    }

    console.log(
        `[DEBUG:getPastEventCardsModel] result: ${ret.pastRaces.length} pastRaces`
    );

    return ret;
}
