import { getLeagueSeasonSessions } from '@/fetch-util';

export interface PastEventCardsModel {
    pastRaces: {
        sessionId: string;
        trackId: string;
        date: string;
        isSelected: boolean;
    }[];
}

let _defaultView: PastEventCardsModel = {
    pastRaces: [],
};

export function getDefaultPastEventCardsModel(): PastEventCardsModel {
    return JSON.parse(
        JSON.stringify({
            pastRaces: [],
        })
    );
}

export async function getPastEventCardsModel(
    league: string,
    season: string
): Promise<PastEventCardsModel> {
    let ret: PastEventCardsModel = JSON.parse(JSON.stringify(_defaultView));

    if (!league || !season) {
        return ret;
    }

    let leagueSeasonSessions = await getLeagueSeasonSessions(league, season);

    for (let session of leagueSeasonSessions?.sessions) {
        ret.pastRaces.push({
            trackId: session.track.track_id.toString(),
            date: session.launch_at,
            isSelected: false,
            sessionId: session.subsession_id.toString(),
        });
    }

    return ret;
}
