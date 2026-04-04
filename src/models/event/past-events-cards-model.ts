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
        return ret;
    }

    let [leagueSeasonSessions, simsessionIndex] = await Promise.all([
        getLeagueSeasonSessions(league, season),
        getLeagueSimsessionIndex(league),
    ]);

    let seasonIndex = simsessionIndex?.find(
        (s) => s.season_id.toString() === season
    );

    for (let session of leagueSeasonSessions?.sessions || []) {
        if (session?.subsession_id) {
            let ssiSession: SSI_Session | undefined =
                seasonIndex?.sessions.find(
                    (s) => s.subsession_id === session.subsession_id
                );
            let raceSimsession = ssiSession?.simsessions.find(
                (s) => s.type === 'race'
            );
            let simsessionId =
                raceSimsession?.simsession_id ??
                ssiSession?.simsessions[0]?.simsession_id;

            ret.pastRaces.push({
                trackId: session.track.track_id.toString(),
                date: session.launch_at,
                isSelected: false,
                sessionId: session?.subsession_id?.toString() || '',
                simsessionId: simsessionId?.toString() || '',
            });
        }
    }

    return ret;
}
