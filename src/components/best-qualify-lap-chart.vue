<script setup lang="ts">
import { watchEffect, ref, watch } from 'vue';
import type { Ref } from 'vue';
import LineChart from '@/components/line-chart.vue';
import type { BestQualifyLapChartModel } from '@/models/best-qualify-lap-chart-model';
import {
    getDefaultBestQualifyLapChartModel,
    getBestQualifyLapChartModel,
} from '@/models/best-qualify-lap-chart-model';

const props = defineProps<{
    subsession: string;
    simsession: string;
    league: string;
}>();

const bestQualifyLapChartModel: Ref<BestQualifyLapChartModel> = ref(
    getDefaultBestQualifyLapChartModel()
);

async function fetchModel() {
    bestQualifyLapChartModel.value = await getBestQualifyLapChartModel(
        props.subsession,
        props.simsession,
        props.league
    );
}

watchEffect(fetchModel);
watch(props, fetchModel);
</script>

<template>
    <LineChart :data="bestQualifyLapChartModel.lapTimes" />
</template>
