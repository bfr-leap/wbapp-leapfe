import {
    getCuratedActiveLeagueSchedule,
    getUserFeatures,
} from '@/utils/fetch-util';

export interface HomeModel {
    leagueName: string;
    nextRace: { trackId: string; date: string; isSelected: boolean };
    selectedRace: { trackId: string; date: string; isSelected: boolean };
    futureRaces: { trackId: string; date: string; isSelected: boolean }[];
    leagueId: string;
    seasonId: string;
    carId: string;
    allowEditCalendar: boolean;
}

export function getDefaultHomeModel(): HomeModel {
    return JSON.parse(
        JSON.stringify({
            leagueName: '----',
            nextRace: { trackId: '0', date: '', isSelected: false },
            selectedRace: { trackId: '0', date: '', isSelected: false },
            futureRaces: [],
            leagueId: '',
            seasonId: '',
            carId: '',
            allowEditCalendar: false,
        })
    );
}

export async function getHomeModel(
    league: string,
    season: string
): Promise<HomeModel> {
    let ret: HomeModel = getDefaultHomeModel();
    let now: number = new Date().getTime();
    let s = await getCuratedActiveLeagueSchedule();
    let features = await getUserFeatures();

    if (!s) {
        return ret;
    }

    ret.leagueId = league;
    ret.seasonId = season;

    let selectedLeague = s.leagues.find(
        (l) => l.league_id.toString() === ret.leagueId
    );
    let selectedSeason = selectedLeague?.seasons.find(
        (s) => s.season_id.toString() === ret.seasonId
    );

    if (!selectedLeague || !selectedSeason) {
        return ret;
    }

    ret.carId = selectedSeason.car_id.toString();

    let events = selectedSeason.events
        .filter((e) => new Date(e.time).getTime() > now)
        .filter((v, i) => i < 4);

    ret.nextRace = ret.selectedRace = {
        trackId: events[0]?.track_id.toString(),
        date: events[0]?.time,
        isSelected: true,
    };

    ret.futureRaces = [];
    for (let i = 1; i < events.length; ++i) {
        ret.futureRaces.push({
            trackId: events[i].track_id.toString(),
            date: events[i].time,
            isSelected: false,
        });
    }

    if (features.indexOf('league_cdr_admin') > -1) {
        ret.allowEditCalendar = true;
    }

    return ret;
}
