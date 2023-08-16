<script setup lang="ts">
import { watchEffect, ref, watch } from 'vue';
import type { Ref } from 'vue';
import BarChart from './BarChart.vue';

import type { PaceChartModel } from '../models/pace-chart-model';
import {
    getDefaultPaceChartModel,
    getPaceChartModel,
} from '../models/pace-chart-model';

const props = defineProps<{
    subsession?: string;
    simsession?: string;
    league?: string;
}>();

const paceChartModel: Ref<PaceChartModel> = ref(getDefaultPaceChartModel());

async function fetchModel() {
    paceChartModel.value = await getPaceChartModel(
        props.subsession || '',
        props.simsession || '',
        props.league || ''
    );
}

watchEffect(fetchModel);
watch(props, fetchModel);
</script>

<template>
    <BarChart
        :title="paceChartModel.title"
        :data="paceChartModel.barChartData"
    />
</template>
