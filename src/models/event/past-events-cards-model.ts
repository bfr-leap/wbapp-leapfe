import { getLeagueSeasonSessions } from '@@/src/utils/fetch-util';

export interface PastEventCardsModel {
    pastRaces: {
        sessionId: string;
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

    let leagueSeasonSessions = await getLeagueSeasonSessions(league, season);

    for (let session of leagueSeasonSessions?.sessions || []) {
        if (session?.subsession_id) {
            ret.pastRaces.push({
                trackId: session.track.track_id.toString(),
                date: session.launch_at,
                isSelected: false,
                sessionId: session?.subsession_id?.toString() || '',
            });
        }
    }

    return ret;
}
