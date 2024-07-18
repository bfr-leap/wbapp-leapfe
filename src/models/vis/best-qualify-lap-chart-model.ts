import type { SeriesXY } from '@/models/vis/line-chart-model';
import {
    getTelemetrySubsessionIds,
    getCumulativeDeltaBestLapChartData,
} from '@/utils/fetch-util';

export interface BestQualifyLapChartModel {
    lapTimes: SeriesXY[];
}

export function getDefaultBestQualifyLapChartModel(): BestQualifyLapChartModel {
    return JSON.parse(JSON.stringify({ lapTimes: [] }));
}

export async function getBestQualifyLapChartModel(
    subsession: string,
    simsession: string,
    league: string
): Promise<BestQualifyLapChartModel> {
    let ret = getDefaultBestQualifyLapChartModel();
    ret.lapTimes = [];

    let telemetrySubsessionIds = await getTelemetrySubsessionIds(league);

    let telemetryAvailable =
        -1 !== telemetrySubsessionIds?.indexOf(parseInt(subsession, 10));

    if (telemetryAvailable) {
        let r = await getCumulativeDeltaBestLapChartData(
            league,
            subsession,
            simsession
        );

        let xKey = 'Lap Percent';
        let keys = Object.keys(r?.[0] || {}).filter((k) => k !== xKey);

        let lapDeltas: SeriesXY[] = keys.map((k) => {
            let d = r
                ?.map((v) => {
                    return { x: <number>v[xKey], y: <number>v[k] };
                })
                .filter((v) => v.y !== undefined) || [];
            return { name: k, data: d };
        });

        ret.lapTimes = lapDeltas;
    }

    return ret;
}
