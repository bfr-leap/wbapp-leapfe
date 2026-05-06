<script setup lang="ts">
import { computed } from 'vue';
import type { Ref } from 'vue';
import ScopeBar from './scope-bar.vue';
import type { ScopeDimension } from './scope-types';
import type { LeagueSeasonMenuModel } from '@@/src/models/nav/league-season-menu-model';
import {
    getDefaultLeagueSeasonMenuModel,
    getLeagueSeasonMenuModel,
} from '@@/src/models/nav/league-season-menu-model';

const props = defineProps<{
    league: string;
    season: string;
    targetPage: string;
}>();

const { isSignedIn } = useAuthState();

async function fetchModel() {
    return await getLeagueSeasonMenuModel(
        props.league,
        props.season,
        props.targetPage,
        isSignedIn
    );
}

const model: Ref<LeagueSeasonMenuModel> =
    await asyncDataWithReactiveModel<LeagueSeasonMenuModel>(
        `LeagueSeasonChipModel-${[
            props.league,
            props.season,
            props.targetPage,
        ].join('-')}`,
        fetchModel,
        getDefaultLeagueSeasonMenuModel,
        [() => props.league, () => props.season, () => props.targetPage]
    );

const dimensions = computed<ScopeDimension[]>(() => [
    {
        key: 'league',
        label: 'League',
        selected: model.value.leagueOptions.selected,
        options: model.value.leagueOptions.options,
        priority: 'primary',
    },
    {
        key: 'season',
        label: 'Season',
        selected: model.value.seasonOptions.selected,
        options: model.value.seasonOptions.options,
        priority: 'primary',
        mono: true,
    },
]);
</script>

<template>
    <ScopeBar v-bind:dimensions="dimensions" />
</template>
