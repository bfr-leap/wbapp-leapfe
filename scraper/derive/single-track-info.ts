import {
    LapChartData,
    LeagueSeasons,
    LeagueSeasonSessions,
    LSS_Session,
    LS_SeasonSummary,
    SimsessionResults,
    TrackStats,
} from '../../src/iracing-endpoints.js';
import {
    calculateRaceResults,
    calculateQualifyResults,
    RACE_SPRINT_THRESHOLD,
} from './results-utils.js';
import { acceptLapChartDataVisitor } from './lap-chart-data-visitor.js';
import { wf } from './file-writer.js';

const SimsessionTypes = {
    RACE: 6,
    QUALI: 5,
};

function sortRowsByField(
    rows: { [name: string]: string }[],
    field: string,
    ascending: boolean = false
) {
    if (ascending) {
        rows.sort(
            (a, b) =>
                Number.parseInt(a[field], 10) - Number.parseInt(b[field], 10)
        );
    } else {
        rows.sort(
            (a, b) =>
                Number.parseInt(b[field], 10) - Number.parseInt(a[field], 10)
        );
    }
}

function getTrackStatsFromStore(
    leagueId: number,
    carId: number,
    trackId: number,
    displayName: string,
    trackResultsStore: { [name: string]: TrackStats }
): TrackStats {
    let k = `${leagueId}_${carId}_${trackId}`;
    let ret = trackResultsStore[k];
    if (!ret) {
        ret = trackResultsStore[k] = {
            league_id: leagueId,
            car_id: carId,
            track_id: trackId,
            display_name: displayName,
            best_quali: {
                title: 'Quali Record',
                keys: [],
                rows: [],
            },
            poles: {
                title: 'Poles',
                keys: [],
                rows: [],
            },
            race_lap: {
                title: 'Race Lap Record',
                keys: [],
                rows: [],
            },
            fastest_race_lap: {
                title: 'Fastest Race Lap',
                keys: [],
                rows: [],
            },
            numb_entries: {
                title: 'Number of Entries',
                keys: [],
                rows: [],
            },
            wins: {
                title: 'Wins',
                keys: [],
                rows: [],
            },
            podiums: {
                title: 'Podiums',
                keys: [],
                rows: [],
            },
            hard_chargers: {
                title: 'Hard Chargers',
                keys: [],
                rows: [],
            },
        };
    }

    return ret;
}

export function deriveSingleTrackInfo(leagueId: number) {
    let trackResultsStore: { [name: string]: TrackStats } = {};
    acceptLapChartDataVisitor(
        leagueId,
        (
            leagueSeasons: LeagueSeasons,
            seasonInfo: LS_SeasonSummary,
            leaguSeasonSessions: LeagueSeasonSessions,
            sessionInfo: LSS_Session,
            lapChartData: LapChartData
        ) => {
            let r: SimsessionResults;

            let trackStats = getTrackStatsFromStore(
                leagueId,
                sessionInfo.cars[0].car_id,
                lapChartData.session_info.track.track_id,
                `${lapChartData.session_info.track.track_name} - ${sessionInfo.cars[0].car_name}`,
                trackResultsStore
            );

            if (
                lapChartData.session_info.simsession_type ===
                SimsessionTypes.RACE
            ) {
                r = calculateRaceResults(lapChartData);

                // winners
                let currentWinner = r.results[0];
                let driverRow = trackStats.wins.rows.find(
                    (r) => r['cust_id'] === currentWinner.cust_id.toString()
                );
                if (!driverRow) {
                    driverRow = {
                        cust_id: currentWinner.cust_id.toString(),
                        count: '0',
                    };
                    trackStats.wins.rows.push(driverRow);
                }

                driverRow['count'] = (
                    Number.parseInt(driverRow['count']) + 1
                ).toString();
                // /winners

                // podiums
                for (let i = 0; i < 3; ++i) {
                    let currentPodium = r.results[i];
                    let driverRow = trackStats.podiums.rows.find(
                        (r) => r['cust_id'] === currentPodium.cust_id.toString()
                    );
                    if (!driverRow) {
                        driverRow = {
                            cust_id: currentPodium.cust_id.toString(),
                            count: '0',
                        };
                        trackStats.podiums.rows.push(driverRow);
                    }

                    driverRow['count'] = (
                        Number.parseInt(driverRow['count']) + 1
                    ).toString();
                }
                // /podiums

                // race lap record
                let currentBestLap = r.results[0];
                for (let rr of r.results) {
                    if (currentBestLap.fastest_lap_time > rr.fastest_lap_time) {
                        currentBestLap = rr;
                    }
                }

                let bestRaceLapRow = trackStats.race_lap.rows[0];
                if (!bestRaceLapRow) {
                    bestRaceLapRow = {
                        time: Number.MAX_SAFE_INTEGER.toString(),
                        cust_id: currentBestLap.cust_id.toString(),
                        date: lapChartData.session_info.start_time,
                    };
                    trackStats.race_lap.rows.push(bestRaceLapRow);
                }

                if (
                    currentBestLap.fastest_lap_time <
                    Number.parseInt(bestRaceLapRow['time'], 10)
                ) {
                    bestRaceLapRow['time'] =
                        currentBestLap.fastest_lap_time.toString();
                    bestRaceLapRow['cust_id'] =
                        currentBestLap.cust_id.toString();
                    bestRaceLapRow['date'] =
                        lapChartData.session_info.start_time;
                }
                // /race lap record

                // fastest race lap
                driverRow = trackStats.fastest_race_lap.rows.find(
                    (r) => r['cust_id'] === currentBestLap.cust_id.toString()
                );
                if (!driverRow) {
                    driverRow = {
                        cust_id: currentBestLap.cust_id.toString(),
                        count: '0',
                    };
                    trackStats.fastest_race_lap.rows.push(driverRow);
                }

                driverRow['count'] = (
                    Number.parseInt(driverRow['count']) + 1
                ).toString();
                // /fastest race lap

                if (r.results[0].laps_completed > RACE_SPRINT_THRESHOLD) {
                    trackStats.numb_entries.rows.push({
                        subsession_id: sessionInfo.subsession_id.toString(),
                        count: r.results.length.toString(),
                    });
                } else {
                }
            } else {
                r = calculateQualifyResults(lapChartData);
                if (
                    lapChartData.session_info.simsession_type ===
                    SimsessionTypes.QUALI
                ) {
                    // poles
                    let currentPole = r.results[0];
                    let driverRow = trackStats.poles.rows.find(
                        (r) => r['cust_id'] === currentPole.cust_id.toString()
                    );
                    if (!driverRow) {
                        driverRow = {
                            cust_id: currentPole.cust_id.toString(),
                            count: '0',
                        };
                        trackStats.poles.rows.push(driverRow);
                    }

                    driverRow['count'] = (
                        Number.parseInt(driverRow['count']) + 1
                    ).toString();
                    // /poles

                    // best quali lap
                    let bestQualiRow = trackStats.best_quali.rows[0];
                    if (!bestQualiRow) {
                        bestQualiRow = {
                            time: Number.MAX_SAFE_INTEGER.toString(),
                            cust_id: currentPole.cust_id.toString(),
                            date: lapChartData.session_info.start_time,
                        };
                        trackStats.best_quali.rows.push(bestQualiRow);
                    }

                    if (
                        currentPole.fastest_lap_time <
                        Number.parseInt(bestQualiRow['time'], 10)
                    ) {
                        bestQualiRow['time'] =
                            currentPole.fastest_lap_time.toString();
                        bestQualiRow['cust_id'] =
                            currentPole.cust_id.toString();
                        bestQualiRow['date'] =
                            lapChartData.session_info.start_time;
                    }
                    // /best quali lap
                }
            }
        }
    );

    let keys = Object.keys(trackResultsStore);
    for (let k of keys) {
        sortRowsByField(trackResultsStore[k].fastest_race_lap.rows, 'count');

        sortRowsByField(
            trackResultsStore[k].numb_entries.rows,
            'subsession_id'
        );
        sortRowsByField(trackResultsStore[k].podiums.rows, 'count');
        sortRowsByField(trackResultsStore[k].poles.rows, 'count');
        sortRowsByField(trackResultsStore[k].wins.rows, 'count');

        wf(trackResultsStore[k], `trackResults_${k}.json`);
    }
}
