<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { ref, watch } from 'vue';
import type { Ref } from 'vue';
import type { TrackResultsMenuModel } from '@@/src/models/nav/track-results-menu-model';
import {
    getTrackResultsMenuModel,
    getDefaultTrackResultsMenuModel,
} from '@@/src/models/nav/track-results-menu-model';
import RouterLinkProxy from '@@/src/components/nav/router-link-proxy.vue';

const props = defineProps<{
    league: string;
    car: string;
    track: string;
}>();

let trackResultsMenuModel: Ref<TrackResultsMenuModel> = ref(
    getDefaultTrackResultsMenuModel()
);

async function fetchModel() {
    trackResultsMenuModel.value = await getTrackResultsMenuModel(
        props.league,
        props.car,
        props.track
    );
}
watch(props, fetchModel, { immediate: true });
</script>

<template>
    <div class="gh-nav-bar">
        <span class="gh-nav-label">
            {{ trackResultsMenuModel.currentLeague }}
        </span>
        <div class="dropdown">
            <button
                class="btn btn-dark dropdown-toggle"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
            >
                {{ trackResultsMenuModel.carOptions.selected }}
            </button>
            <ul class="dropdown-menu">
                <li
                    v-for="carOption in trackResultsMenuModel.carOptions
                        .options"
                >
                    <RouterLinkProxy
                        class="dropdown-item"
                        type="button"
                        v-bind:to="carOption.href"
                    >
                        {{ carOption.display }}
                    </RouterLinkProxy>
                </li>
            </ul>
        </div>
        <div class="dropdown">
            <button
                class="btn btn-dark dropdown-toggle"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
            >
                {{ trackResultsMenuModel.trackOptions.selected }}
            </button>
            <ul class="dropdown-menu">
                <li
                    v-for="trackOption in trackResultsMenuModel.trackOptions
                        .options"
                >
                    <RouterLinkProxy
                        class="dropdown-item"
                        type="button"
                        v-bind:to="trackOption.href"
                    >
                        {{ trackOption.display }}
                    </RouterLinkProxy>
                </li>
            </ul>
        </div>
    </div>
</template>

<style scoped>
.gh-nav-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 0;
    flex-wrap: wrap;
}

.gh-nav-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--gh-fg-default);
}
</style>
