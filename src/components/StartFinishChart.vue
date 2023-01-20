<script setup lang="ts">
import { watchEffect, ref, computed } from 'vue';
import type { Ref } from 'vue';
// import LineChart from './LineChart.vue';
// import type { SeriesXY } from './LineChart.vue';
import type { LapChartData, LCD_Chunk } from '../iracing-endpoints';
import BarChart from './HLBarChart.vue';
import { getLapChartData, getSingleMemberData } from '@/fetch-util';

const props = defineProps<{
    subsession?: string;
    simsession?: string;
}>();

const title = ref<string>('Start Finish');

const barChartData: Ref<{ name: string; hi: number; lo: number }[]> = ref([
    { name: 'a', hi: 1, lo: 0 },
    { name: 'b', hi: 2, lo: 0 },
]);

watchEffect(async () => {
    if (props.simsession == undefined || props.subsession == undefined) {
        return;
    }

    let lapChartData = await getLapChartData(
        props.subsession,
        props.simsession
    );

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

    barChartData.value = Object.keys(startFinishDriverMap)
        .map((k) => startFinishDriverMap[k])
        .sort((a, b) => {
            return a.laps === b.laps ? a.time - b.time : b.laps - a.laps;
        })
        .map((v, i) => {
            return { name: v.display, hi: i * -1, lo: v.start * -1 };
        });
});
</script>

<template>
    <BarChart :title="title" :data="barChartData" />
</template>
