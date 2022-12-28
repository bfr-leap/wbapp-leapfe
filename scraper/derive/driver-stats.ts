import {
    LapChartData,
    LeagueSeasons,
    LeagueSeasonSessions,
    LSS_Session,
    LS_SeasonSummary,
    SimsessionResults,
    DriverStatsMap,
    DriverStats,
} from '../../src/iracing-endpoints.js';

import {
    calculateRaceResults,
    calculateQualifyResults,
} from './results-utils.js';
import { wf } from './file-writer.js';
import { acceptLapChartDataVisitor } from './lap-chart-data-visitor.js';

function getSeasonStatsMap(
    map: { [name: number]: DriverStatsMap },
    seasonId: number
): DriverStatsMap {
    let ret = map[seasonId];
    if (!ret) {
        ret = map[seasonId] = {};
    }
    return ret;
}

function getStats(map: DriverStatsMap, custId: number): DriverStats {
    let ret = map[custId];
    if (!ret) {
        ret = map[custId] = {
            cust_id: custId,
            started: 0,
            finished: 0,
            wins: 0,
            podiums: 0,
            top_10: 0,
            top_20: 0,
            fast_laps: 0,
            hard_charger: 0,
            poles: 0,
            power_points: 0,
            incidents: 0,
        };
    }

    return ret;
}

export function deriveDriverStats(leagueId: number) {
    let carrerStatsMap: DriverStatsMap = {};
    let seasonStatsMapStore: { [name: number]: DriverStatsMap } = {};

    seasonStatsMapStore[0] = carrerStatsMap;

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
            let seasonStatsMap = getSeasonStatsMap(
                seasonStatsMapStore,
                seasonInfo.season_id
            );
            if (lapChartData.session_info.simsession_type === 6) {
                r = calculateRaceResults(lapChartData);

                for (let res of r.results) {
                    let cStats = getStats(carrerStatsMap, res.cust_id);
                    let sStats = getStats(seasonStatsMap, res.cust_id);

                    cStats.power_points += res.points;
                    sStats.power_points += res.points;

                    cStats.incidents += res.incidents;
                    sStats.incidents += res.incidents;

                    cStats.started += 1;
                    sStats.started += 1;

                    if (res.position === 1) {
                        cStats.wins += 1;
                        sStats.wins += 1;
                    }

                    if (res.position <= 3) {
                        cStats.podiums += 1;
                        sStats.podiums += 1;
                    }

                    if (res.position <= 10) {
                        cStats.top_10 += 1;
                        sStats.top_10 += 1;
                    }

                    if (res.position <= 20) {
                        cStats.top_20 += 1;
                        sStats.top_20 += 1;
                    }
                }
            } else if (lapChartData.session_info.simsession_type === 5) {
                r = calculateQualifyResults(lapChartData);
                let cStats = getStats(carrerStatsMap, r.results[0].cust_id);
                let sStats = getStats(seasonStatsMap, r.results[0].cust_id);
                cStats.poles += 1;
                sStats.poles += 1;

                for (let res of r.results) {
                    let cStats = getStats(carrerStatsMap, res.cust_id);
                    let sStats = getStats(seasonStatsMap, res.cust_id);

                    cStats.incidents += res.incidents;
                    sStats.incidents += res.incidents;
                }
            }
        }
    );

    wf(seasonStatsMapStore, `leagueDriverStats_${leagueId}.json`);
}
