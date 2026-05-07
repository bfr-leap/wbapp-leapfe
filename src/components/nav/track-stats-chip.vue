<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Ref } from 'vue';
import ScopeBar from './scope-bar.vue';
import type { ScopeDimension } from './scope-types';
import type { TrackResultsMenuModel } from '@@/src/models/nav/track-results-menu-model';
import {
    getDefaultTrackResultsMenuModel,
    getTrackResultsMenuModel,
} from '@@/src/models/nav/track-results-menu-model';

const props = defineProps<{
    league: string;
    car: string;
    track: string;
}>();

const model: Ref<TrackResultsMenuModel> = ref(
    getDefaultTrackResultsMenuModel()
);

async function fetchModel() {
    model.value = await getTrackResultsMenuModel(
        props.league,
        props.car,
        props.track
    );
}
watch(props, fetchModel, { immediate: true });

const dimensions = computed<ScopeDimension[]>(() => [
    {
        key: 'car',
        label: 'Car',
        selected: model.value.carOptions.selected,
        options: model.value.carOptions.options,
        priority: 'primary',
    },
    {
        key: 'track',
        label: 'Track',
        selected: model.value.trackOptions.selected,
        options: model.value.trackOptions.options,
        priority: 'primary',
    },
]);
</script>

<template>
    <ScopeBar v-bind:dimensions="dimensions" />
</template>
