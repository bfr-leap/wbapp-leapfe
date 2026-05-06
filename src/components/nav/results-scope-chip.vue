<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Ref } from 'vue';
import ScopeBar from './scope-bar.vue';
import type { ScopeDimension } from './scope-types';
import type { LeagueIndexModel } from '@@/src/models/nav/league-index-model';
import {
    getDefaultLeagueIndexModel,
    getLeagueIndexModel,
} from '@@/src/models/nav/league-index-model';

const props = defineProps<{
    league: string;
    season: string;
    subsession: string;
    simsession: string;
}>();

const { isSignedIn } = useAuthState();
const model: Ref<LeagueIndexModel> = ref(getDefaultLeagueIndexModel());

async function fetchModel() {
    model.value = await getLeagueIndexModel(
        props.league,
        props.season,
        props.subsession,
        props.simsession,
        isSignedIn
    );
}
watch(props, fetchModel, { immediate: true });

const dimensions = computed<ScopeDimension[]>(() => [
    {
        key: 'subsession',
        label: 'Round',
        selected: model.value.subsessionOptions.selected,
        options: model.value.subsessionOptions.options,
        priority: 'primary',
        truncate: true,
    },
    {
        key: 'simsession',
        label: 'Session',
        selected: model.value.simsessionOptions.selected,
        options: model.value.simsessionOptions.options,
        priority: 'primary',
        mono: true,
    },
    {
        key: 'league',
        label: 'League',
        selected: model.value.leagueOptions.selected,
        options: model.value.leagueOptions.options,
        priority: 'secondary',
    },
    {
        key: 'season',
        label: 'Season',
        selected: model.value.seasonOptions.selected,
        options: model.value.seasonOptions.options,
        priority: 'secondary',
    },
]);
</script>

<template>
    <ScopeBar v-bind:dimensions="dimensions" />
</template>
