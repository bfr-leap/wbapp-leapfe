/**
 *
 * This TypeScript file defines scoring rules and functions for processing iRacing simsession results. It
 * contains implementations for calculating race and qualifying results based on given lap data. The code
 * assigns points to drivers based on their positions, fastest lap times, and safety performance, and then
 * sorts and arranges the results accordingly.
 *
 */

import {
    LapChartData,
    LCD_Chunk,
    SimsessionResults,
    SSR_ResultsEntry,
} from '../../src/iracing-endpoints';

export const RACE_SPRINT_THRESHOLD = 15;

interface ScoringRules {
    position_pts: number[];
    fastest_lap_pts: number;
    safest_driver: number;
}

const featureScoring: ScoringRules = {
    position_pts: [25, 22, 20, 18, 16, 14, 12, 10, 8, 6, 4, 2],
    fastest_lap_pts: 1,
    safest_driver: 1,
};

const sprintScoring: ScoringRules = {
    position_pts: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
    fastest_lap_pts: 0,
    safest_driver: 0,
};

function applyScoring(
    simsessionResults: SimsessionResults,
    rules: ScoringRules
) {
    let fastestLapTime = Infinity;
    let fastestLapIdx = -1;

    let leastIncidents = Infinity;
    let leastIncidentsIdx = -1;

    let totalLaps = simsessionResults.results[0].laps_completed;

    let i = 0;
    for (let r of simsessionResults.results) {
        if (r.fastest_lap_time < fastestLapTime) {
            fastestLapTime = r.fastest_lap_time;
            fastestLapIdx = i;
        }

        if (r.incidents < leastIncidents && r.laps_completed > totalLaps / 2) {
            leastIncidents = r.incidents;
            leastIncidentsIdx = i;
        }

        if (rules.position_pts[i]) {
            r.points += rules.position_pts[i];
        }

        ++i;
    }

    if (fastestLapIdx >= 0) {
        simsessionResults.results[fastestLapIdx].points +=
            rules.fastest_lap_pts;
    }

    if (leastIncidentsIdx >= 0) {
        simsessionResults.results[leastIncidentsIdx].points +=
            rules.safest_driver;
    }
}

export function calculateRaceResults(lapData: LapChartData): SimsessionResults {
    let ret: SimsessionResults = arrangeSimsessionResults(lapData);

    let numLaps = ret.results[0].laps_completed;

    if (numLaps > RACE_SPRINT_THRESHOLD) {
        applyScoring(ret, featureScoring);
    } else {
        applyScoring(ret, sprintScoring);
    }

    return ret;
}

function arrangeSimsessionResults(lapData: LapChartData): SimsessionResults {
    let ret: SimsessionResults = {
        subsession_id: lapData.session_info.subsession_id,
        simsession_number: lapData.session_info.simsession_number,
        results: getResultEntries(lapData.chunk_info),
    };

    return ret;
}

export function calculateQualifyResults(
    lapData: LapChartData
): SimsessionResults {
    let ret: SimsessionResults = arrangeSimsessionResults(lapData);

    ret.results.sort((a, b) => {
        let al = a.fastest_lap_time;
        let bl = b.fastest_lap_time;

        if (al < 0) {
            al = Infinity;
        }
        if (bl < 0) {
            bl = Infinity;
        }

        return al - bl;
    });

    let p = 1;
    for (let r of ret.results) {
        r.position = p;
        ++p;
    }

    return ret;
}

function getResultEntries(chunks: LCD_Chunk[]): SSR_ResultsEntry[] {
    let resultEntries: SSR_ResultsEntry[] = [];
    let resultMap: { [name: number]: SSR_ResultsEntry } = {};
    let sortMap: {
        [name: number]: { last_lap: number; last_position: number };
    } = {};

    for (let chunk of chunks) {
        let entry: SSR_ResultsEntry = resultMap[chunk.cust_id];
        if (!entry) {
            entry = resultMap[chunk.cust_id] = {
                cust_id: chunk.cust_id,
                position: -1,
                start_position: chunk.lap_position,
                interval: -1,
                avg_lap_time: -1,
                fastest_lap_time: Infinity,
                fast_lap: -1,
                laps_completed: chunk.lap_number,
                points: 0,
                incidents: 0,
                pace_percent: -1,
            };
        }

        entry.laps_completed = chunk.lap_number;

        if (
            entry.fastest_lap_time > chunk.lap_time &&
            chunk.incident === false &&
            chunk.lap_events.length === 0 &&
            chunk.lap_number > 0 &&
            chunk.lap_time > 0
        ) {
            entry.fast_lap = chunk.lap_number;
            entry.fastest_lap_time = chunk.lap_time;
        }

        entry.incidents += chunk.lap_events.length;

        sortMap[chunk.cust_id] = {
            last_lap: chunk.lap_number,
            last_position: chunk.lap_position,
        };
    }

    for (let cId in resultMap) {
        resultEntries.push(resultMap[cId]);
    }

    resultEntries.sort((a: SSR_ResultsEntry, b: SSR_ResultsEntry) => {
        let sortIdxA = sortMap[a.cust_id];
        let sortIdxB = sortMap[b.cust_id];
        if (sortIdxA.last_lap === sortIdxB.last_lap) {
            return sortIdxA.last_position - sortIdxB.last_position;
        }
        return sortIdxB.last_lap - sortIdxA.last_lap;
    });

    let p = 1;
    let fastestLap = Infinity;
    for (let r of resultEntries) {
        r.position = p;
        if (r.fastest_lap_time < fastestLap) {
            fastestLap = r.fastest_lap_time;
        }
        ++p;
    }

    for (let r of resultEntries) {
        r.pace_percent = r.fastest_lap_time / fastestLap - 1;
        r.pace_percent *= 100;
        r.pace_percent = Math.round(r.pace_percent * 100) / 100;
    }

    return resultEntries;
}
