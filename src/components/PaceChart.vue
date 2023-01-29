<script setup lang="ts">
import { watchEffect, ref } from 'vue';
import type { Ref } from 'vue';
import BarChart from './BarChart.vue';
import { getSingleMemberData, getSimsessionResults } from '@/fetch-util';

const props = defineProps<{
    subsession?: string;
    simsession?: string;
}>();

const title = ref<string>('Pace Percent');

const barChartData: Ref<{ name: string; value: number }[]> = ref([
    { name: 'a', value: 1 },
    { name: 'b', value: 2 },
]);

watchEffect(async () => {
    if (props.simsession == undefined || props.subsession == undefined) {
        return;
    }

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

    barChartData.value = simsessionResults.results.map((v, i) => {
        return {
            name: driverNameMaps[v.cust_id] + ' : P' + (i + 1),
            value: v.pace_percent,
        };
    });
});
</script>

<template>
    <BarChart :title="title" :data="barChartData" />
</template>
