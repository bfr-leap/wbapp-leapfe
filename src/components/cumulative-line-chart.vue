<script setup lang="ts">
import { watchEffect, ref } from 'vue';
import type { Ref } from 'vue';
import LineChart from './line-chart.vue';
import type { SeriesXY } from '@/models/line-chart-model';
import type { CumulativeLineChartModel } from '@/models/cumulative-line-chart-model';
import {
    getCumulativeLineChartModel,
    getDefaultCumulativeLineChartModel,
} from '@/models/cumulative-line-chart-model';

const props = defineProps<{
    series: SeriesXY[];
}>();

const cumulativeLineChartModel: Ref<CumulativeLineChartModel> = ref(
    getDefaultCumulativeLineChartModel()
);

watchEffect(async () => {
    cumulativeLineChartModel.value = getCumulativeLineChartModel(props.series);
});
</script>

<template>
    <LineChart
        :title="cumulativeLineChartModel.titleOut"
        :data="cumulativeLineChartModel.seriesOut"
        :y-range="[
            cumulativeLineChartModel.yRange[0],
            cumulativeLineChartModel.yRange[1],
        ]"
    />
</template>
