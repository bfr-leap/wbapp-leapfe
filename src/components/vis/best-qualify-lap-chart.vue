<script setup lang="ts">
import { watchEffect, ref, watch } from 'vue';
import type { Ref } from 'vue';
import LineChart from '@@/src/components/vis/line-chart.vue';
import type { BestQualifyLapChartModel } from '@@/src/models/vis/best-qualify-lap-chart-model';
import {
    getDefaultBestQualifyLapChartModel,
    getBestQualifyLapChartModel,
} from '@@/src/models/vis/best-qualify-lap-chart-model';

const props = defineProps<{
    subsession: string;
    simsession: string;
    league: string;
}>();

async function fetchModel() {
    return await getBestQualifyLapChartModel(
        props.subsession,
        props.simsession,
        props.league
    );
}

const bestQualifyLapChartModel: Ref<BestQualifyLapChartModel> =
    await asyncDataWithReactiveModel<BestQualifyLapChartModel>(
        `BestQualifyLapChartModel-${[
            props.subsession,
            props.simsession,
            props.league,
        ]
            .map((v) => v.toString())
            .join('-')}`,
        fetchModel,
        getDefaultBestQualifyLapChartModel,
        [() => props.league, () => props.subsession, () => props.simsession]
    );
</script>

<template>
    <LineChart :data="bestQualifyLapChartModel.lapTimes" />
</template>
