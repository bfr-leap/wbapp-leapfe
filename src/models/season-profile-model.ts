import {
    getCuratedActiveLeagueSchedule,
    getLeagueSimsessionIndex,
    getLeagueSeasonSessions,
} from '@/utils/fetch-util';
import { getSessionStats } from '@/utils/results-util';

export interface SeasonProfileModel {
    leagueName: string;
    leagueId: string;
    seasonId: string;
    carId: string;
    nextRace: { trackId: string; date: string; isSelected: boolean };
    selectedRace: { trackId: string; date: string; isSelected: boolean };
    futureRaces: { trackId: string; date: string; isSelected: boolean }[];
    stats: {
        [name: string]: {
            [name: string]: string;
        }[];
    };
}

export function getDefaultSeasonProfileModel(): SeasonProfileModel {
    return {
        leagueName: '----',
        leagueId: '0',
        seasonId: '0',
        carId: '0',
        nextRace: { trackId: '0', date: '', isSelected: false },
        selectedRace: { trackId: '0', date: '', isSelected: false },
        futureRaces: [],
        stats: { Overall: [], Race: [], Sprint: [] },
    };
}

export function getChartDataFromStats(
    stats: {
        [name: string]: {
            [name: string]: string;
        }[];
    },
    stat: string,
    split: string
): { name: string; value: number }[] {
    let data: { name: string; value: number }[] = [];

    let round = 1;

    for (let row of stats[split]) {
        data.push({
            name: `R${round++}`,
            value: Number.parseFloat(row[stat]),
        });
    }

    // the last data item is the total/average, remove it
    data.pop();

    return data;
}

export async function getSeasonProfileModel(
    leagueId: string,
    seasonId: string
): Promise<SeasonProfileModel> {
    const statSplit = ['Overall', 'Race', 'Sprint'];
    let seasonProfileModel = getDefaultSeasonProfileModel();
    let now: number = new Date().getTime();

    let curatedSchedule = await getCuratedActiveLeagueSchedule();

    if (!leagueId) {
        leagueId = curatedSchedule.leagues[0].league_id.toString();
    }

    if (!seasonId) {
        seasonId = curatedSchedule.leagues[0].seasons[0].season_id.toString();
    }

    let curatedLeagueInfo = curatedSchedule.leagues.find(
        (l) => l.league_id.toString() === leagueId
    );
    let curatedSeasonInfo = curatedLeagueInfo?.seasons.find(
        (s) => s.season_id.toString() === seasonId
    );

    seasonProfileModel.leagueId = leagueId;
    seasonProfileModel.seasonId = seasonId;

    let leagueSeasonsSimsessionIndex = await getLeagueSimsessionIndex(leagueId);

    let seasonSimsessions = leagueSeasonsSimsessionIndex.find(
        (s) => s.season_id.toString() === seasonId
    );

    let leagueSeasonSessions = await getLeagueSeasonSessions(
        leagueId,
        seasonId
    );

    if (seasonSimsessions) {
        for (let split of statSplit) {
            let roundNum = 0;
            let totalParticipation = 0;
            let totalLaps = 0;
            let totalIncidents = 0;
            let totalIpL = 0;

            for (let session of leagueSeasonSessions.sessions) {
                session.track.track_id;
                session.launch_at;

                if (!session.subsession_id) {
                    session.subsession_id = -1;
                }

                let sessionStats = await getSessionStats(
                    leagueId,
                    seasonId,
                    session.subsession_id.toString(),
                    split
                );

                if (sessionStats.race_number_of_laps > 0) {
                    totalParticipation += sessionStats.race_participants;
                    totalLaps += sessionStats.race_number_of_laps;
                    totalIncidents += sessionStats.race_incident_count;
                    seasonProfileModel.stats[split].push({
                        session: `R${++roundNum}`,
                        number_of_participants:
                            sessionStats.race_participants.toString(),
                        number_of_laps:
                            sessionStats.race_number_of_laps.toString(),
                        number_of_incidents:
                            sessionStats.race_incident_count.toString(),
                        incidents_per_lap: (
                            sessionStats.race_incident_count /
                            sessionStats.race_number_of_laps
                        ).toFixed(2),
                    });
                }
            }

            seasonProfileModel.stats[split].push({
                session: `total/average`,
                number_of_participants: (totalParticipation / roundNum).toFixed(
                    2
                ),
                number_of_laps: totalLaps.toString(),
                number_of_incidents: totalIncidents.toString(),
                incidents_per_lap: (totalIncidents / totalLaps).toFixed(2),
            });
        }
    }

    if (curatedSeasonInfo) {
        seasonProfileModel.carId = curatedSeasonInfo.car_id.toString();

        let events = curatedSeasonInfo.events
            .filter((e) => new Date(e.time).getTime() > now)
            .filter((v, i) => i < 4);

        if (events.length > 0) {
            seasonProfileModel.nextRace = seasonProfileModel.selectedRace = {
                trackId: events[0].track_id.toString(),
                date: events[0].time,
                isSelected: true,
            };
        }

        seasonProfileModel.futureRaces = [];
        for (let i = 1; i < events.length; ++i) {
            seasonProfileModel.futureRaces.push({
                trackId: events[i].track_id.toString(),
                date: events[i].time,
                isSelected: false,
            });
        }
    }

    return seasonProfileModel;
}
