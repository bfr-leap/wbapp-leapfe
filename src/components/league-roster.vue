<script setup lang="ts">
import { ref, watch, watchEffect } from 'vue';
import GenericTable from './generic-table.vue';
import { getRosterModel, getDefaultRosterModel } from '@/models/league-roster-model';

const props = defineProps<{
    league: string;
}>();

const model = ref<any>(getDefaultRosterModel());


async function fetchModel() {
    model.value = await getRosterModel(props.league);
}

watchEffect(fetchModel);
watch(props, fetchModel);

</script>
<template>
    <GenericTable v-bind:season-id="model?.seasonId?.toString() || ''"
        v-bind:league-id="model?.league?.toString() || ''" v-bind:rows="model.rows" v-bind:title="model.title">
    </GenericTable>
</template>