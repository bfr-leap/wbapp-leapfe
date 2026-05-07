<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import type { Ref } from 'vue';
import type { TrackStats } from 'lplib/endpoint-types/iracing-endpoints';
import { getTrackStats } from '@@/src/utils/fetch-util';
import GenericTable from '@@/src/components/vis/generic-table.vue';
import TrackBanner from '@@/src/components/track/track-banner.vue';

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

async function fetchJsonData() {
    let v = await getTrackStats(props.league, props.car, props.track);

    if (v) {
        trackResult.value = v;
    }
}
watchEffect(fetchJsonData);
</script>

<template>
    <div class="page">
        <section class="section">
            <TrackBanner v-bind:track-id="props.track" />
        </section>
        <section class="section">
            <div class="track-tables">
                <GenericTable
                    v-bind:title="trackResult.best_quali.title"
                    v-bind:league-id="props.league"
                    v-bind:rows="trackResult.best_quali.rows"
                    season-id="-1"
                />
                <GenericTable
                    v-bind:title="trackResult.race_lap.title"
                    v-bind:league-id="props.league"
                    v-bind:rows="trackResult.race_lap.rows"
                    season-id="-1"
                />
                <GenericTable
                    v-bind:title="trackResult.poles.title"
                    v-bind:league-id="props.league"
                    v-bind:rows="trackResult.poles.rows"
                    season-id="-1"
                />
                <GenericTable
                    v-bind:title="trackResult.fastest_race_lap.title"
                    v-bind:league-id="props.league"
                    v-bind:rows="trackResult.fastest_race_lap.rows"
                    season-id="-1"
                />
                <GenericTable
                    v-bind:title="trackResult.wins.title"
                    v-bind:league-id="props.league"
                    v-bind:rows="trackResult.wins.rows"
                    season-id="-1"
                />
                <GenericTable
                    v-bind:title="trackResult.podiums.title"
                    v-bind:league-id="props.league"
                    v-bind:rows="trackResult.podiums.rows"
                    season-id="-1"
                />
            </div>
        </section>
    </div>
</template>

<style scoped>
.track-tables {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4);
}
</style>
