import { getCuratedActiveLeagueSchedule } from '../fetch-util';

interface RaceInfoModel {
    trackId: string;
    date: string;
    isSelected: boolean;
}

interface ScheduleModel {
    leagueName: string;
    nextRace: RaceInfoModel;
    selectedRace: RaceInfoModel;
    futureRaces: RaceInfoModel[];
}

export interface NextEventTimerEmbedModel {
    schedule: ScheduleModel;
    leagueId: string;
    seasonId: string;
    carId: string;
}

export function getDefaultNextEventTimerEmbedModel() {
    return JSON.parse(
        JSON.stringify({
            schedule: {
                leagueName: '----',
                nextRace: { trackId: '0', date: '', isSelected: false },
                selectedRace: { trackId: '0', date: '', isSelected: false },
                futureRaces: [],
            },
            leagueId: '',
            seasonId: '',
            carId: '',
        })
    );
}

export async function getNextEventTimerEmbedModel(
    league: string,
    season: string
): Promise<NextEventTimerEmbedModel> {
    const ret = getDefaultNextEventTimerEmbedModel();
    ret.leagueId = league;
    ret.seasonId = season;

    let now: number = new Date().getTime();

    let s = await getCuratedActiveLeagueSchedule();

    if (!ret.leagueId) {
        ret.leagueId = s.leagues[0].league_id.toString();
    }

    if (!ret.seasonId) {
        ret.seasonId = s.leagues[0].seasons[0].season_id.toString();
    }

    let selectedLeague = s.leagues.find(
        (l) => l.league_id.toString() === ret.leagueId
    );
    let selectedSeason = selectedLeague?.seasons.find(
        (s) => s.season_id.toString() === ret.seasonId
    );

    if (!selectedLeague || !selectedSeason) {
        ret.schedule = getDefaultNextEventTimerEmbedModel().schedule;
        return ret;
    }

    ret.carId = selectedSeason.car_id.toString();

    let events = selectedSeason.events
        .filter((e) => new Date(e.time).getTime() > now)
        .filter((v, i) => i < 4);

    ret.schedule.nextRace = ret.schedule.selectedRace = {
        trackId: events[0].track_id.toString(),
        date: events[0].time,
        isSelected: true,
    };

    ret.schedule.futureRaces = [];
    for (let i = 1; i < events.length; ++i) {
        ret.schedule.futureRaces.push({
            trackId: events[i].track_id.toString(),
            date: events[i].time,
            isSelected: false,
        });
    }

    return ret;
}
