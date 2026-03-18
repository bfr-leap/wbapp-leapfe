<script setup lang="ts">
import type { Ref } from 'vue';
import BarChartUnovis from '@@/src/components/vis/bar-chart-unovis.vue';

import type { PaceChartModel } from '@@/src/models/vis/pace-chart-model';
import {
    getDefaultPaceChartModel,
    getPaceChartModel,
} from '@@/src/models/vis/pace-chart-model';

const props = defineProps<{
    subsession?: string;
    simsession?: string;
    league?: string;
}>();

async function fetchModel() {
    return await getPaceChartModel(
        props.subsession || '',
        props.simsession || '',
        props.league || ''
    );
}

const paceChartModel: Ref<PaceChartModel> =
    await asyncDataWithReactiveModel<PaceChartModel>(
        `PaceChartModel-${[
            props.subsession || '',
            props.simsession || '',
            props.league || '',
        ].join('-')}`,
        fetchModel,
        getDefaultPaceChartModel,
        [() => props.league, () => props.subsession, () => props.simsession]
    );
</script>

<template>
    <BarChartUnovis
        :title="paceChartModel.title"
        :data="paceChartModel.barChartData"
    />
</template>
