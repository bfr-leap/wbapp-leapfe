<script setup lang="ts">
import { watchEffect, watch, ref } from 'vue';
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

// A cumulative delta chart is a graphical representation of the time differences between two or
// more cars over the course of a race. It is often used in motorsports, particularly in timed racing events,
// to show the difference in lap times between drivers or teams.

// The chart is typically displayed on a computer screen or other electronic display, and it shows the difference
// in lap times between the leader and the other drivers or teams in the race. The x-axis represents the race distance,
// while the y-axis represents the time difference.

// The chart typically starts with the leader's time at zero on the y-axis, and then shows the time difference between
// each driver or team as a cumulative line on the chart. So, for example, if the second-place driver is two seconds
// behind the leader after the first lap, the line for that driver on the chart would start at two seconds on the y-axis.

// As the race progresses, the chart shows how the time differences between the drivers or teams change, and it can be
// a useful tool for spectators, commentators, and drivers to track the progress of the race and see how the different competitors are performing.

// Overall, the cumulative delta chart is a simple yet effective way to visualize the time differences between
// drivers or teams in a race, and it can help provide valuable insights into the dynamics of the competition.

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

async function fectchJsonData() {
    if (props.simsession == undefined || props.subsession == undefined) {
        return;
    }

    const lapChartData = await getLapChartData(
        props.subsession,
        props.simsession
    );

    const startGrid = getStartGrid(lapChartData.chunk_info);

    lapTimes.value = getLapTimes(lapChartData, startGrid);
}

watchEffect(fectchJsonData);
watch(props, fectchJsonData);

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
