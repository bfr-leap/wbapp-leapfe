import {
    LapChartData,
    LCD_Chunk,
    SimsessionResults,
    SSR_ResultsEntry,
} from '../src/iracing-endpoints';

export function calculateRaceResults(lapData: LapChartData): SimsessionResults {
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
    let ret: SimsessionResults = calculateRaceResults(lapData);

    ret.results.sort((a, b) => a.fastest_lap_time - b.fastest_lap_time);

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
    for (let r of resultEntries) {
        r.position = p;
        ++p;
    }

    return resultEntries;
}
