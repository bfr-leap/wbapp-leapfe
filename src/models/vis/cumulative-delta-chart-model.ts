import type { LCD_Chunk } from 'lplib/endpoint-types/iracing-endpoints';
import {
    getLapChartData,
    getCumulativeDeltaChartData,
} from '@/utils/fetch-util';
import type { SeriesXY } from '@/models/vis/line-chart-model';

interface GridItem {
    custid: number;
    is_ai: number;
    displayName: string;
    helmetPattern: number;
    licenseLevel: number;
}

function getStartGrid(chunks: LCD_Chunk[]): GridItem[] {
    let startgrid: GridItem[] = [];
    let gridMap: { [name: number]: GridItem } = {};
    let sortMap: {
        [name: number]: { last_lap: number; last_position: number };
    } = {};

    for (let chunk of chunks) {
        gridMap[chunk.cust_id] = {
            custid: chunk.cust_id,
            is_ai: 0,
            displayName: chunk.display_name,
            helmetPattern: chunk.helmet.pattern,
            licenseLevel: chunk.license_level,
        };

        sortMap[chunk.cust_id] = {
            last_lap: chunk.lap_number,
            last_position: chunk.lap_position,
        };
    }

    for (let cId in gridMap) {
        startgrid.push(gridMap[cId]);
    }

    startgrid.sort((a: GridItem, b: GridItem) => {
        let sortIdxA = sortMap[a.custid];
        let sortIdxB = sortMap[b.custid];
        if (sortIdxA.last_lap === sortIdxB.last_lap) {
            return sortIdxA.last_position - sortIdxB.last_position;
        }
        return sortIdxB.last_lap - sortIdxA.last_lap;
    });

    return startgrid;
}

export interface CumulativeDeltaChartModel {
    series: SeriesXY[];
    range: [number, number];
}

export async function getCumulativeDeltaChartModel(
    league: string,
    simsession: string,
    subsession: string
): Promise<CumulativeDeltaChartModel> {
    if (simsession == undefined || subsession == undefined) {
        return { series: [], range: [0, 1] };
    }

    const lapChartData = await getLapChartData(subsession, simsession);

    const startGrid = getStartGrid(lapChartData?.chunk_info || []);

    let name2gridMap: { [name: string]: number } = {};

    let driverNames: { [key: number]: string } = {};
    for (let r of lapChartData?.chunk_info || []) {
        driverNames[r.cust_id] = r.display_name; // na[na.length - 1].substring(0, 3);
    }

    let i = 0;
    for (let gridItem of startGrid) {
        name2gridMap[driverNames[gridItem.custid]] = i++;
    }

    let r = await getCumulativeDeltaChartData(league, subsession, simsession);
    let xKey = 'Lap';
    let keys = Object.keys(r?.[0] || {}).filter((k) => k !== xKey);

    let ret: SeriesXY[] = keys.map((k) => {
        let d =
            r
                ?.map((v) => {
                    return { x: <number>v[xKey], y: <number>v[k] };
                })
                .filter((v) => v.y !== undefined) || [];
        return { name: k, data: d };
    });

    ret.sort((a, b) => name2gridMap[a.name] - name2gridMap[b.name]);

    for (let series of ret) {
        series.name = `P${name2gridMap[series.name] + 1} - ${series.name}`;
    }

    let lapNum = (ret[0].data.length = ret[0].data.length);
    const relevantLapPercent = 0.95;

    let yRange: [number, number] = [Infinity, -Infinity];

    for (let singleSeries of ret) {
        let r1 = yRange[0];
        let r2 = yRange[1];
        for (let lDelta of singleSeries.data) {
            if (!isNaN(lDelta.y)) {
                r1 = Math.min(r1, lDelta.y);
                r2 = Math.max(r2, lDelta.y);
            }
        }

        if (lapNum * relevantLapPercent <= singleSeries.data.length) {
            yRange[0] = r1;
            yRange[1] = r2;
        } else {
            break;
        }
    }

    return { series: ret, range: yRange };
}
