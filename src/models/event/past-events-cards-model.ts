import {
    getDriverResults,
    getLeagueSeasonSessions,
    getLeagueSimsessionIndex,
} from '@@/src/utils/fetch-util';
import type { SSI_Session } from 'lplib/endpoint-types/iracing-endpoints';

export interface PastEventCardEntry {
    sessionId: string;
    simsessionId: string;
    trackId: string;
    date: string;
    isSelected: boolean;
    protagonistFinish?: number;
    protagonistStart?: number;
}

export interface PastEventCardsModel {
    pastRaces: PastEventCardEntry[];
}

export function getDefaultPastEventCardsModel(): PastEventCardsModel {
    return { pastRaces: [] };
}

export async function getPastEventCardsModel(
    league: string,
    season: string,
    irCustId?: string
): Promise<PastEventCardsModel> {
    let ret: PastEventCardsModel = getDefaultPastEventCardsModel();

    if (!league || !season) {
        return ret;
    }

    let [leagueSeasonSessions, simsessionIndex, driverResults] =
        await Promise.all([
            getLeagueSeasonSessions(league, season),
            getLeagueSimsessionIndex(league),
            irCustId
                ? getDriverResults(league, irCustId, 'race')
                : Promise.resolve(null),
        ]);

    let seasonIndex = simsessionIndex?.find(
        (s) => s.season_id.toString() === season
    );

    const seasonResults = driverResults?.[Number.parseInt(season)] ?? null;

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

            const entry: PastEventCardEntry = {
                trackId: session.track.track_id.toString(),
                date: session.launch_at,
                isSelected: false,
                sessionId: session?.subsession_id?.toString() || '',
                simsessionId: simsessionId?.toString() || '',
            };

            const result = seasonResults?.[session.subsession_id];
            if (result) {
                entry.protagonistFinish = result.position;
                entry.protagonistStart = result.start_position;
            }

            ret.pastRaces.push(entry);
        }
    }

    return ret;
}
