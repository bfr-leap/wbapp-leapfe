<script setup lang="ts">
import { watchEffect, ref } from 'vue';
import type { Ref } from 'vue';
import BarChart from './hl-bar-chart.vue';
import type { HLBarChartDatum } from '@/models/vis/hl-bar-chart-model';
import { getStartFinishData } from '@/models/vis/start-finish-chart-model';

const props = defineProps<{
    league?: string;
    subsession?: string;
    simsession?: string;
}>();

const title = ref<string>('Start Finish');

const barChartData: Ref<HLBarChartDatum[]> = ref([
    { name: 'a', hi: 1, lo: 0 },
    { name: 'b', hi: 2, lo: 0 },
]);

watchEffect(async () => {
    barChartData.value = await getStartFinishData(
        props.league || '',
        props.subsession || '',
        props.simsession || ''
    );
});
</script>

<template>
    <BarChart :title="title" :data="barChartData" />
</template>
