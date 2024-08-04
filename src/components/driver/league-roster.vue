<script setup lang="ts">
import { ref, watch, watchEffect } from 'vue';
import GenericTable from '../vis/generic-table.vue';
import {
    getRosterModel,
    getDefaultRosterModel,
} from '@@/src/models/driver/league-roster-model';
import type { LeagueRosterModel } from '@@/src/models/driver/league-roster-model';

const props = defineProps<{
    league: string;
}>();

// const model = ref<LeagueRosterModel>(getDefaultRosterModel());

async function fetchModel() {
    return await getRosterModel(props.league);
}

// watchEffect(fetchModel);
// watch(props, fetchModel);

const model: Ref<LeagueRosterModel> =
    await asyncDataWithReactiveModel<LeagueRosterModel>(
        `LeagueSeasonMenuModel-${props.league}`,
        fetchModel,
        getDefaultRosterModel,
        [() => props.league]
    );
</script>
<template>
    <GenericTable
        v-bind:season-id="model?.seasonId?.toString() || ''"
        v-bind:league-id="model?.league?.toString() || ''"
        v-bind:rows="model.rows"
        v-bind:title="model.title"
    >
    </GenericTable>
</template>
