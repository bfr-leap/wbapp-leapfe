<script setup lang="ts">
import { watchEffect, ref } from 'vue';
import type { Ref } from 'vue';
import ComulativeLineChart from './ComulativeLineChart.vue';
import type { SeriesXY } from './LineChart.vue';
import type { LapChartData, LCD_Chunk } from '../iracing-endpoints';
import { getLapChartData } from '@/fetch-util';

const props = defineProps<{
    subsession?: string;
    simsession?: string;
}>();

const lapTimes: Ref<SeriesXY[]> = ref([]);

function getLapTimes(
    lapChartInfo: LapChartData,
    startgrid: GridItem[]
): SeriesXY[] {
    let uid2gridMap: { [name: number]: number } = {};

    let ret: { x: number; y: number }[][] = [];

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
        ret[uid2gridMap[lapdataIt.cust_id]].push({ x: 0, y: cTime });
    }

    for (let lapdataIt of lapChartInfo.chunk_info) {
        if (lapdataIt.lap_number === 0) {
            continue;
        }

        let cTime = lapdataIt.session_time - prevLapMap[lapdataIt.cust_id];

        prevLapMap[lapdataIt.cust_id] = lapdataIt.session_time;

        ret[uid2gridMap[lapdataIt.cust_id]].push({
            x: lapdataIt.lap_number,
            y: cTime,
        });
    }

    for (let laps of ret) {
        for (let lap of laps) {
            lap.y = lap.y / 10000;
        }
    }

    return ret.map((d, index) => {
        let driverName: string = startgrid?.[index].displayName ?? '';
        driverName = decodeURI(driverName).replace(/\+/g, ' ');

        return {
            name: `P${index + 1} - ${driverName}`,
            data: d,
        };
    });
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

watchEffect(async () => {
    if (props.simsession == undefined || props.subsession == undefined) {
        return;
    }

    const lapChartData = await getLapChartData(
        props.subsession,
        props.simsession
    );

    const startGrid = getStartGrid(lapChartData.chunk_info);

    lapTimes.value = getLapTimes(lapChartData, startGrid);
});

interface GridItem {
    custid: number;
    is_ai: number;
    displayName: string;
    helmetPattern: number;
    licenseLevel: number;
}
</script>

<template>
    <ComulativeLineChart :series="lapTimes" />
</template>
