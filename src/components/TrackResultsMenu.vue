<script setup lang="ts">
import { getMemberViewFromM_Memeber, getRoadLicense } from './driverUtils';
import { RouterLink } from 'vue-router';
import { ref, watchEffect, watch } from 'vue';
import type { Ref } from 'vue';
import type { TrackStats } from '../iracing-endpoints';
import { getTrackStats, getTrackInfoDirectory } from '@/fetch-util';
import type { DefineStoreOptionsInPlugin } from 'pinia';
import GenericTable from './GenericTable.vue';

const props = defineProps<{
    league: string;
    car: string;
    track: string;
}>();

let currentLeague: Ref<string> = ref('League Name');

let carOptions: Ref<{
    selected: string;
    options: { display: string; href: string }[];
}> = ref({
    selected: '---',
    options: [{ display: '--', href: '#' }],
});

let trackOptions: Ref<{
    selected: string;
    options: { display: string; href: string }[];
}> = ref({
    selected: '---',
    options: [
        { display: '--', href: '#' },
        { display: '----', href: '#' },
    ],
});

async function fectchJsonData() {
    console.log('fetch results menu data');
    let trackInfoDirectory = await getTrackInfoDirectory(props.league);

    carOptions.value.selected = trackInfoDirectory.car_display[props.car];
    trackOptions.value.selected = trackInfoDirectory.track_display[props.track];
    currentLeague.value = trackInfoDirectory.league_name;

    trackOptions.value.options = [];
    for (let trackIdOption of trackInfoDirectory.car_2_track_map[props.car]) {
        trackOptions.value.options.push({
            display: trackInfoDirectory.track_display[trackIdOption],
            href: `?m=track&league=${props.league}&car=${props.car}&track=${trackIdOption}`,
        });
    }

    carOptions.value.options = [];
    for (let carIdOption of Object.keys(trackInfoDirectory.car_2_track_map)) {
        let trackOption =
            trackInfoDirectory.car_2_track_map[carIdOption].indexOf(
                props.track.toString()
            ) !== -1
                ? props.track
                : trackInfoDirectory.car_2_track_map[carIdOption][0]; // keep the same track if we can or select the first available track

        carOptions.value.options.push({
            display: trackInfoDirectory.car_display[carIdOption],
            href: `?m=track&league=${props.league}&car=${carIdOption}&track=${trackOption}`,
        });
    }
}
watchEffect(fectchJsonData);
watch(props, fectchJsonData);
</script>

<template>
    <div class="card bg-dark text-light m-2">
        <div class="card-body p-2">
            <form class="row row-cols-lg-auto g-3 align-items-center">
                <span>
                    {{ currentLeague }}
                </span>
                <div class="dropdown">
                    <button
                        class="btn btn-secondary dropdown-toggle"
                        type="button"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                    >
                        {{ carOptions.selected }}
                    </button>
                    <ul class="dropdown-menu">
                        <li v-for="carOption in carOptions.options">
                            <RouterLink
                                class="dropdown-item"
                                type="button"
                                v-bind:to="carOption.href"
                            >
                                {{ carOption.display }}
                            </RouterLink>
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
                        {{ trackOptions.selected }}
                    </button>
                    <ul class="dropdown-menu">
                        <li v-for="trackOption in trackOptions.options">
                            <RouterLink
                                class="dropdown-item"
                                type="button"
                                v-bind:to="trackOption.href"
                            >
                                {{ trackOption.display }}
                            </RouterLink>
                        </li>
                    </ul>
                </div>
            </form>
        </div>
    </div>
</template>
