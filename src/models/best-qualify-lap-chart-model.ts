import type { SeriesXY } from '@/models/line-chart-model';
import {
    getSingleMemberData,
    getSimsessionResults,
    getTelemetrySubsessionIds,
} from '@/utils/fetch-util';
import { getBestLaps } from '@/utils/telemetry-util';
import type { ST_LapTelemetry } from 'ir-endpoints-types';

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
        -1 !== telemetrySubsessionIds.indexOf(parseInt(subsession, 10));

    let simsessionResults = await getSimsessionResults(subsession, simsession);

    let driverNameMaps: { [name: number]: string } = {};

    for (let r of simsessionResults.results) {
        driverNameMaps[r.cust_id] = (
            await getSingleMemberData(r.cust_id.toString())
        ).display_name;
    }

    let fastestLaps: ST_LapTelemetry[] = [];

    if (telemetryAvailable) {
        fastestLaps = await getBestLaps(
            subsession,
            simsession,
            simsessionResults.results.map((v) => v.cust_id.toString())
        );

        let uid2NameMap: { [name: number]: string } = {};

        for (let res of simsessionResults.results) {
            let custid = res.cust_id;
            let mData = await getSingleMemberData(custid.toString());
            uid2NameMap[custid] = mData.display_name;
        }

        ret.lapTimes = fastestLaps.map((tLap, i) => {
            let tp: number = -1;

            let d = tLap.telemetry.map((t) => {
                let y = -1 === tp ? 0 : t.t - tp;
                tp = t.t;
                return { x: t.perc, y: y / 60 };
            });
            d.shift();
            return {
                name: `P${i + 1}: ${
                    uid2NameMap[simsessionResults.results[i].cust_id]
                }`,
                data: d,
            };
        });
    }

    return ret;
}
