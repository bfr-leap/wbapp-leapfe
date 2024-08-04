<script setup lang="ts">
import { watchEffect, ref } from 'vue';
import type { Ref } from 'vue';
import BarChart from './hl-bar-chart.vue';
import type { HLBarChartDatum } from '@@/src/models/vis/hl-bar-chart-model';
import { getStartFinishData } from '@@/src/models/vis/start-finish-chart-model';

const props = defineProps<{
    league?: string;
    subsession?: string;
    simsession?: string;
}>();

const title = ref<string>('Start Finish');

function getDefaultStartFinishModel() {
    return [
        { name: 'a', hi: 1, lo: 0 },
        { name: 'b', hi: 2, lo: 0 },
    ];
}

async function fetchModel() {
    return await getStartFinishData(
        props.league || '',
        props.subsession || '',
        props.simsession || ''
    );
}

const barChartData: Ref<HLBarChartDatum[]> = await asyncDataWithReactiveModel<
    HLBarChartDatum[]
>(
    `HLBarChartDatum-${[
        props.league || '',
        props.subsession || '',
        props.simsession || '',
    ].join('-')}`,
    fetchModel,
    getDefaultStartFinishModel,
    [() => props.league, () => props.subsession, () => props.simsession]
);
</script>

<template>
    <BarChart :title="title" :data="barChartData" />
</template>
