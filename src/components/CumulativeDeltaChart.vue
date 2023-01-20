<script setup lang="ts">
import { watchEffect, ref, computed } from 'vue';
import type { Ref } from 'vue';
import LineChart from './LineChart.vue';
import type { SeriesXY } from './LineChart.vue';
import type { LapChartData, LCD_Chunk } from '../iracing-endpoints';
import { getLapChartData } from '@/fetch-util';

interface LapDelta {
    lap: number;
    delta: number;
}

const props = defineProps<{
    subsession?: string;
    simsession?: string;
}>();

const lapChartData: Ref<LapChartData | null> = ref(null);

watchEffect(async () => {
    if (props.simsession == undefined || props.subsession == undefined) {
        return;
    }

    lapChartData.value = await getLapChartData(
        props.subsession,
        props.simsession
    );
});

const startGrid = computed(() => {
    if (!lapChartData.value) {
        return null;
    }
    let startgrid: GridItem[] = getStartGrid(lapChartData.value.chunk_info);
    return startgrid;
});
const lapDeltaAndBaseline = computed(() => {
    if (!lapChartData.value || !startGrid.value) {
        return null;
    }
    return getLapDeltas(getLapTimes(lapChartData.value, startGrid.value));
});

const title = computed(() => {
    if (!lapChartData.value || !lapDeltaAndBaseline.value) {
        return '';
    }
    const trackName = lapChartData.value.session_info.track.track_name.replace(
        /\+/g,
        ' '
    );
    const sessionName = lapChartData.value.session_info.session_name.replace(
        /\+/g,
        ' '
    );
    const startTime = lapChartData.value.session_info.start_time;
    const baseLine = lapDeltaAndBaseline.value.baselineTime;
    return `Baseline ${baseLine}s`;
});

interface LapTime {
    lap: number;
    time: number;
}
interface GridItem {
    custid: number;
    is_ai: number;
    displayName: string;
    helmetPattern: number;
    licenseLevel: number;
}
function getLapTimes(
    lapChartInfo: LapChartData,
    startgrid: GridItem[]
): LapTime[][] {
    let uid2gridMap: { [name: number]: number } = {};

    let ret: LapTime[][] = [];

    let i = 0;
    for (let gridItem of startgrid) {
        uid2gridMap[gridItem.custid] = i++;
        ret.push([]);
    }

    let prevLapMap: { [name: number]: number } = {};
    let firstTime = lapChartInfo.chunk_info[0].session_time;

    for (let lapdataIt of lapChartInfo.chunk_info) {
        if (lapdataIt.lap_number !== 0) {
            break;
        }

        let cTime = lapdataIt.session_time - firstTime;

        prevLapMap[lapdataIt.cust_id] = lapdataIt.session_time;
        ret[uid2gridMap[lapdataIt.cust_id]].push({ lap: 0, time: cTime });
    }

    for (let lapdataIt of lapChartInfo.chunk_info) {
        if (lapdataIt.lap_number === 0) {
            continue;
        }

        let cTime = lapdataIt.session_time - prevLapMap[lapdataIt.cust_id];

        prevLapMap[lapdataIt.cust_id] = lapdataIt.session_time;

        ret[uid2gridMap[lapdataIt.cust_id]].push({
            lap: lapdataIt.lap_number,
            time: cTime,
        });
    }

    for (let laps of ret) {
        for (let lap of laps) {
            lap.time = lap.time / 10000;
        }
    }

    return ret;
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

function getLapDeltas(lapTimes: LapTime[][]): {
    data: LapDelta[][];
    baselineTime: number;
} {
    let baselineTime = Math.round(
        lapTimes
            .map((driverLaps: LapTime[]) =>
                driverLaps
                    .map((lapTime) => lapTime.time)
                    .reduce(function (min, value, _, { length }) {
                        if (value <= 1 || isNaN(value)) {
                            return min;
                        }
                        return Math.min(min, value);
                    }, Infinity)
            )
            .reduce(function (min, value, _, { length }) {
                if (value <= 1 || isNaN(value)) {
                    return min;
                }
                return Math.min(min, value);
            }, Infinity) * 1.07
    );

    let ret: LapDelta[][] = lapTimes.map((dLapTimes) =>
        dLapTimes.map((dLapTime) => {
            return {
                lap: dLapTime.lap,
                delta: dLapTime.time - baselineTime,
            };
        })
    );

    for (let dDeltas of ret) {
        dDeltas.shift();

        for (let i = 1; i < dDeltas.length; ++i) {
            dDeltas[i].delta += dDeltas[i - 1].delta;
        }
    }

    return {
        data: ret,
        baselineTime,
    };
}

const series = computed(() => {
    if (!lapDeltaAndBaseline.value || !startGrid.value) {
        return [];
    }

    const ret: SeriesXY<LapDelta>[] = lapDeltaAndBaseline.value.data.map(
        (d, index) => {
            let driverName: string =
                startGrid?.value?.[index].displayName ?? '';
            driverName = decodeURI(driverName).replace(/\+/g, ' ');
            // let da = driverName.split(' ');
            // driverName = da[da.length - 1];
            // if (driverName.length > 3) {
            //     driverName = driverName.substring(0, 3);
            // }
            return {
                name: `P${index + 1} - ${driverName}`,
                xProp: 'lap',
                yProp: 'delta',
                data: d,
            };
        }
    );
    return ret;
});

const yRange = computed(() => {
    let ret = [1, -1];

    if (!lapDeltaAndBaseline.value || !startGrid.value) {
        return ret;
    }

    ret[0] = lapDeltaAndBaseline.value.data[0][0].delta;
    ret[1] = lapDeltaAndBaseline.value.data[0][0].delta;

    let lapNum = lapDeltaAndBaseline.value.data[0].length;

    const relevantLapPercent = 0.95;

    for (let ld of lapDeltaAndBaseline.value.data) {
        let r1 = ret[0];
        let r2 = ret[1];
        for (let lDelta of ld) {
            r1 = Math.max(r1, lDelta.delta);
            r2 = Math.min(r2, lDelta.delta);
        }

        if (lapNum * relevantLapPercent <= ld.length) {
            ret[0] = r1;
            ret[1] = r2;
        } else {
            break;
        }
    }

    return ret;
});
</script>

<template>
    <LineChart
        :title="title"
        :data="series"
        :y-range="[yRange[0], yRange[1]]"
    />
</template>
