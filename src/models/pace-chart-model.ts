import {
    getSingleMemberData,
    getSimsessionResults,
    getTelemetrySubsessionIds,
} from '@/utils/fetch-util';

import { getIdealLaps } from '@/utils/telemetry-util';

export interface PaceChartModel {
    title: string;
    barChartData: { name: string; value: number }[];
}

export function getDefaultPaceChartModel(): PaceChartModel {
    return JSON.parse(
        JSON.stringify({
            title: 'Pace Percent',
            barChartData: [
                { name: 'a', value: 1 },
                { name: 'b', value: 2 },
            ],
        })
    );
}

export async function getPaceChartModel(
    subsession: string,
    simsession: string,
    league: string
): Promise<PaceChartModel> {
    let ret: PaceChartModel = getDefaultPaceChartModel();
    ret.barChartData = [];

    if (
        simsession == undefined ||
        subsession == undefined ||
        league == undefined
    ) {
        return ret;
    }

    let telemetrySubsessionIds = await getTelemetrySubsessionIds(league);
    let telemetryAvailable =
        -1 !== telemetrySubsessionIds.indexOf(parseInt(subsession, 10));
    let simsessionResults = await getSimsessionResults(subsession, simsession);
    let driverNameMaps: { [name: number]: string } = {};

    for (let r of simsessionResults.results) {
        driverNameMaps[r.cust_id] = (
            await getSingleMemberData(r.cust_id.toString())
        ).display_name;
    }

    let fastest = simsessionResults.results[0].fastest_lap_time / 10000;

    let idealLaps: number[] = [];

    if (telemetryAvailable) {
        idealLaps = await getIdealLaps(
            subsession,
            simsession,
            simsessionResults.results.map((v) => v.cust_id.toString())
        );

        ret.title = 'Pace Percent vs Ideal Lap';
    }

    ret.barChartData = simsessionResults.results.map((v, i) => {
        return {
            name: driverNameMaps[v.cust_id] + ' : P' + (i + 1),
            value: v.pace_percent > 7 ? 0 : Math.min(v.pace_percent, 7),
            value2: telemetryAvailable
                ? Math.min(
                      v.pace_percent,
                      100 * (idealLaps[i] / fastest) - 100,
                      7
                  )
                : undefined,
        };
    });

    return ret;
}
