<script setup lang="ts">
import { watchEffect, ref } from 'vue';
import type { Ref } from 'vue';
import BarChart from './BarChart.vue';
import {
    getSingleMemberData,
    getSimsessionResults,
    getTelemetrySubsessionIds,
} from '@/fetch-util';
import { getIdealLaps } from '@/telemetry-util';

const props = defineProps<{
    subsession?: string;
    simsession?: string;
    league?: string;
}>();

const title = ref<string>('Pace Percent');

const barChartData: Ref<{ name: string; value: number }[]> = ref([
    { name: 'a', value: 1 },
    { name: 'b', value: 2 },
]);

watchEffect(async () => {
    if (
        props.simsession == undefined ||
        props.subsession == undefined ||
        props.league == undefined
    ) {
        return;
    }

    let telemetrySubsessionIds = await getTelemetrySubsessionIds(props.league);

    let telemetryAvailable =
        -1 !== telemetrySubsessionIds.indexOf(parseInt(props.subsession, 10));

    let simsessionResults = await getSimsessionResults(
        props.subsession,
        props.simsession
    );

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
            props.subsession,
            props.simsession,
            simsessionResults.results.map((v) => v.cust_id.toString())
        );

        title.value = 'Pace Percent vs Ideal Lap';
    }

    barChartData.value = simsessionResults.results.map((v, i) => {
        return {
            name: driverNameMaps[v.cust_id] + ' : P' + (i + 1),
            value: v.pace_percent,
            value2: telemetryAvailable
                ? Math.min(v.pace_percent, 100 * (idealLaps[i] / fastest) - 100)
                : undefined,
        };
    });
});
</script>

<template>
    <BarChart :title="title" :data="barChartData" />
</template>
