import { getCuratedActiveLeagueSchedule, getUserLeaguesState } from '@/utils/fetch-util';
import { useAuth } from 'vue-clerk';

export interface HomeModel {
    leagueName: string;
    nextRace: { trackId: string; date: string; isSelected: boolean };
    selectedRace: { trackId: string; date: string; isSelected: boolean };
    futureRaces: { trackId: string; date: string; isSelected: boolean }[];
    leagueId: string;
    seasonId: string;
    carId: string;
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
        })
    );
}

export async function getHomeModel(
    league: string,
    season: string
): Promise<HomeModel> {
    let ret: HomeModel = getDefaultHomeModel();
    let now: number = new Date().getTime();

    let signedIn = false;

    try {
        const { isSignedIn } = useAuth();
        signedIn = isSignedIn.value === true;
    } catch (e) { }

    let s = await getCuratedActiveLeagueSchedule();

    if (signedIn) {
        let userLeaguesState = await getUserLeaguesState();

        if (userLeaguesState.length === 0) {
            return ret;
        }

        if (s) {
            s.leagues = s.leagues.filter(
                l => userLeaguesState.findIndex(ls => ls.leagueID === l.league_id) >= 0);
        }

        if (userLeaguesState.findIndex(ls => ls.leagueID.toString() === league) < 0) {
            league = userLeaguesState[0].leagueID.toString();
        }
    }

    ret.leagueId = league;
    ret.seasonId = season;

    if (!ret.leagueId) {
        ret.leagueId = s.leagues[0].league_id.toString();
    }

    if (!ret.seasonId) {
        ret.seasonId =
            s.leagues
                .find((v) => v.league_id.toString() === ret.leagueId)
                ?.seasons[0].season_id.toString() || '???';
    }

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

    return ret;
}
