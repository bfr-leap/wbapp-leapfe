/**
 *
 * This TypeScript file contains a module that processes iRacing simulation session results for a given
 * league. It imports various data types and utility functions related to race and qualification results, as
 * well as lap chart data. It defines a function "deriveLeagueSimSessionResults" that iterates through the
 * lap chart data, calculates race and qualification results based on session types, and organizes and stores
 * the results for different drivers, seasons, and sessions. Finally, the module writes the calculated results
 * to JSON files, categorized by session type and driver, using the provided data writer function "wf".
 *
 */

import {
    LapChartData,
    LeagueSeasons,
    LeagueSeasonSessions,
    LSS_Session,
    LS_SeasonSummary,
    SimsessionResults,
    DriverResults,
} from 'ir-endpoints-types';

import {
    calculateRaceResults,
    calculateQualifyResults,
    RACE_SPRINT_THRESHOLD,
} from './results-utils.js';

import { wf } from './file-writer.js';

import { acceptLapChartDataVisitor } from './lap-chart-data-visitor.js';

type ResultsByDriverStore = {
    [name: number]: DriverResults;
}; // driver -> season -> session -> result

function getDriverSeasonResults(
    custId: number,
    seasonId: number,
    resultsStore: ResultsByDriverStore
) {
    let driverStore = resultsStore[custId];
    if (!driverStore) {
        driverStore = resultsStore[custId] = {};
    }

    let seasonStore = driverStore[seasonId];
    if (!seasonStore) {
        seasonStore = driverStore[seasonId] = {};
    }

    return seasonStore;
}

export function deriveLeagueSimSessionResults(leagueId: number) {
    let resultsStoreRace: ResultsByDriverStore = {}; // driver -> season -> session -> result
    let resultsStoreSprint: ResultsByDriverStore = {}; // driver -> season -> session -> result
    let resultsStoreQuali: ResultsByDriverStore = {}; // driver -> season -> session -> result

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
            let activeStore: ResultsByDriverStore | null;
            if (lapChartData.session_info.simsession_type === 6) {
                r = calculateRaceResults(lapChartData);

                if (r.results[0].laps_completed > RACE_SPRINT_THRESHOLD) {
                    activeStore = resultsStoreRace;
                } else {
                    activeStore = resultsStoreSprint;
                }
            } else {
                r = calculateQualifyResults(lapChartData);
                if (
                    lapChartData.session_info.simsession_type === 5 ||
                    lapChartData.session_info.simsession_type === 4
                ) {
                    activeStore = resultsStoreQuali;
                }
            }

            for (let res of r.results) {
                if (activeStore) {
                    getDriverSeasonResults(
                        res.cust_id,
                        seasonInfo.season_id,
                        activeStore
                    )[sessionInfo.subsession_id] = res;
                }
            }

            wf(
                r,
                `simSessionResults_${lapChartData.session_info.subsession_id}_${lapChartData.session_info.simsession_number}.json`
            );
        }
    );

    let driverIds: string[] = Object.keys(resultsStoreRace);
    for (let custId of driverIds) {
        wf(
            resultsStoreRace[Number.parseInt(custId)],
            `driverSessionResults_${leagueId}_race_${custId}.json`
        );
    }

    driverIds = Object.keys(resultsStoreSprint);
    for (let custId of driverIds) {
        wf(
            resultsStoreSprint[Number.parseInt(custId)],
            `driverSessionResults_${leagueId}_sprint_${custId}.json`
        );
    }

    driverIds = Object.keys(resultsStoreQuali);
    for (let custId of driverIds) {
        wf(
            resultsStoreQuali[Number.parseInt(custId)],
            `driverSessionResults_${leagueId}_quali_${custId}.json`
        );
    }
}
