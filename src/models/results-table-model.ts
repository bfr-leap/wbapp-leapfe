import type { DriverResults, SSR_ResultsEntry } from '../iracing-endpoints';
import { getSubsessionName } from '../session-utils';

export type ResultsTableModel = {
    sessionId: number;
    sessionName: string;
    resultEntry: SSR_ResultsEntry;
}[];

export async function getResultsTableModel(
    results: DriverResults,
    seasonId: number,
    leagueId: string
): Promise<ResultsTableModel> {
    let seasonRaceResults = results?.[seasonId];

    if (!seasonRaceResults) {
        return [];
    }
    const sessionIdsInOrder = Object.keys(seasonRaceResults).map((stringId) =>
        Number.parseInt(stringId)
    );
    sessionIdsInOrder.sort();
    const _subsessionNames: { [name: string]: string } = {};
    for (let it of sessionIdsInOrder) {
        _subsessionNames[it] = await getSubsessionName(leagueId, it.toString());
    }

    let ret: {
        sessionId: number;
        sessionName: string;
        resultEntry: SSR_ResultsEntry;
    }[] = sessionIdsInOrder.map((sessionId) => ({
        sessionId,
        sessionName: _subsessionNames[sessionId] || sessionId.toString(),
        resultEntry: seasonRaceResults[sessionId],
    }));

    let totalPts = 0;
    let pacePctTotal = 0;
    let pacePctCount = 0;
    let posTotal = 0;
    let posCount = 0;
    let startPosTotal = 0;
    let startPosCount = 0;
    let incidentTotal = 0;
    let lapsTotal = 0;

    Object.values(seasonRaceResults).forEach((r) => {
        totalPts += r.points;
        if (!isNaN(r.pace_percent)) {
            pacePctCount += 1;
            pacePctTotal += r.pace_percent;
        }

        posTotal += r.position;
        posCount += 1;
        startPosTotal += r.start_position;
        startPosCount += 1;
        incidentTotal += r.incidents;
        lapsTotal += r.laps_completed;
    });

    ret.push({
        sessionId: -1,
        sessionName: 'average/total',
        resultEntry: {
            cust_id: NaN,
            position: Math.round((100 * posTotal) / posCount) / 100,
            start_position:
                Math.round((100 * startPosTotal) / startPosCount) / 100,
            interval: NaN,
            avg_lap_time: NaN,
            fastest_lap_time: NaN,
            fast_lap: NaN,
            laps_completed: lapsTotal,
            points: totalPts,
            incidents: incidentTotal,
            pace_percent: pacePctCount
                ? Math.round((100 * pacePctTotal) / pacePctCount) / 100
                : NaN,
        },
    });

    return ret;
}
