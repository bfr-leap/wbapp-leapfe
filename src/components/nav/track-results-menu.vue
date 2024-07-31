<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { ref, watchEffect, watch } from 'vue';
import type { Ref } from 'vue';
import type { TrackResultsMenuModel } from '@/models/nav/track-results-menu-model';
import {
    getTrackResultsMenuModel,
    getDefaultTrackResultsMenuModel,
} from '@/models/nav/track-results-menu-model';
import RouterLinkProxy from '@/components/nav/router-link-proxy.vue';

const props = defineProps<{
    league: string;
    car: string;
    track: string;
}>();

let trackResultsMenuModel: Ref<TrackResultsMenuModel> = ref(
    getDefaultTrackResultsMenuModel()
);

async function fectchModel() {
    trackResultsMenuModel.value = await getTrackResultsMenuModel(
        props.league,
        props.car,
        props.track
    );
}
watchEffect(fectchModel);
watch(props, fectchModel);
</script>

<template>
    <div class="card bg-dark text-light m-2">
        <div class="card-body p-2">
            <form class="row row-cols-auto g-3 align-items-center">
                <span>
                    {{ trackResultsMenuModel.currentLeague }}
                </span>
                <div class="dropdown">
                    <button
                        class="btn btn-secondary dropdown-toggle"
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
                        class="btn btn-secondary dropdown-toggle"
                        type="button"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                    >
                        {{ trackResultsMenuModel.trackOptions.selected }}
                    </button>
                    <ul class="dropdown-menu">
                        <li
                            v-for="trackOption in trackResultsMenuModel
                                .trackOptions.options"
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
            </form>
        </div>
    </div>
</template>
