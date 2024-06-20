<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import type { Ref } from 'vue';
import type { TrackStats } from 'ir-endpoints-types';
import { getTrackStats } from '@/utils/fetch-util';
import GenericTable from './generic-table.vue';
import TrackResultsMenu from './track-results-menu.vue';
import TrackBanner from './track-banner.vue';

const props = defineProps<{
    league: string;
    car: string;
    track: string;
}>();

let trackResult: Ref<TrackStats> = ref({
    display_name: '---',
    league_id: -1,
    car_id: -1,
    track_id: -1,
    best_quali: {
        title: '---',
        keys: [],
        rows: [],
    },
    poles: {
        title: '---',
        keys: [],
        rows: [],
    },
    race_lap: {
        title: '---',
        keys: [],
        rows: [],
    },
    fastest_race_lap: {
        title: '---',
        keys: [],
        rows: [],
    },
    numb_entries: {
        title: '---',
        keys: [],
        rows: [],
    },
    wins: {
        title: '---',
        keys: [],
        rows: [],
    },
    podiums: {
        title: '---',
        keys: [],
        rows: [],
    },
    hard_chargers: {
        title: '---',
        keys: [],
        rows: [],
    },
});

async function fectchJsonData() {
    trackResult.value = await getTrackStats(
        props.league,
        props.car,
        props.track
    );
}
watchEffect(fectchJsonData);
</script>

<template>
    <TrackResultsMenu v-bind:league="props.league" v-bind:car="props.car" v-bind:track="props.track" />

    <div class="card bg-dark text-light m-2">
        <div class="card-body p-2">
            <TrackBanner v-bind:track-id="props.track" />
            <div class="container d-flex flex-wrap">
                <GenericTable v-bind:title="trackResult.best_quali.title" v-bind:league-id="props.league"
                    v-bind:rows="trackResult.best_quali.rows" season-id="-1" />
                <GenericTable v-bind:title="trackResult.race_lap.title" v-bind:league-id="props.league"
                    v-bind:rows="trackResult.race_lap.rows" season-id="-1" />
                <div class="col-12"></div>
                <GenericTable v-bind:title="trackResult.poles.title" v-bind:league-id="props.league"
                    v-bind:rows="trackResult.poles.rows" season-id="-1" />
                <GenericTable v-bind:title="trackResult.fastest_race_lap.title" v-bind:league-id="props.league"
                    v-bind:rows="trackResult.fastest_race_lap.rows" season-id="-1" />
                <!-- <GenericTable
                    v-bind:title="trackResult.numb_entries.title"
                    v-bind:league-id="props.league"
                    v-bind:rows="trackResult.numb_entries.rows"
                /> -->
                <GenericTable v-bind:title="trackResult.wins.title" v-bind:league-id="props.league"
                    v-bind:rows="trackResult.wins.rows" season-id="-1" />
                <GenericTable v-bind:title="trackResult.podiums.title" v-bind:league-id="props.league"
                    v-bind:rows="trackResult.podiums.rows" season-id="-1" />
            </div>
        </div>
    </div>
</template>

<style scoped>
.track-bg {
    background-size: cover;
    background-position: center;
    width: 100%;
}

.wrap {
    overflow: hidden;
    position: relative;
}

.bg {
    opacity: 0.8;
    _position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 8em;
    object-fit: cover;
}
</style>
