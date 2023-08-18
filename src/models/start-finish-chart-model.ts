import type { HLBarChartDatum } from '@/models/hl-bar-chart-model';
import { getLapChartData, getSingleMemberData } from '@/utils/fetch-util';

export async function getStartFinishData(
    subsession: string,
    simsession: string
): Promise<HLBarChartDatum[]> {
    if (!simsession || !subsession) {
        return [];
    }

    let lapChartData = await getLapChartData(subsession, simsession);

    let startFinishDriverMap: {
        [name: string]: {
            start: number;
            laps: number;
            time: number;
            display: string;
        };
    } = {};

    let startP = 0;

    for (let chunk of lapChartData.chunk_info) {
        let driver: {
            start: number;
            laps: number;
            time: number;
            display: string;
        } = startFinishDriverMap[chunk.cust_id];
        if (!driver) {
            driver = startFinishDriverMap[chunk.cust_id] = {
                start: 0,
                laps: 0,
                time: 0,
                display: '',
            };
        }

        if (chunk.lap_number === 0) {
            driver.start = startP;
            ++startP;

            driver.display = (
                await getSingleMemberData(chunk.cust_id.toString())
            ).display_name;
        }

        driver.laps = chunk.lap_number;
        driver.time = chunk.session_time;
    }

    let ret = Object.keys(startFinishDriverMap)
        .map((k) => startFinishDriverMap[k])
        .sort((a, b) => {
            return a.laps === b.laps ? a.time - b.time : b.laps - a.laps;
        })
        .map((v, i) => {
            return { name: v.display, hi: i * -1, lo: v.start * -1 };
        });

    return ret;
}
