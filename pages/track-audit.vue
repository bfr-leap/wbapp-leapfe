<script setup lang="ts">
import { ref } from 'vue';
import EventCardLg from '@@/src/components/event/event-card-lg.vue';
import TrackBanner from '@@/src/components/track/track-banner.vue';

const trackIds = ref<string[]>([]);
try {
    const res = await $fetch<{ trackIds: string[] }>('/api/list-track-images');
    trackIds.value = res.trackIds;
} catch (e) {
    console.warn('[track-audit] failed to list track images', e);
}

// Fixed future date so the "up next" countdown renders consistently.
const sampleDate = new Date('2099-01-01T00:00:00Z');
</script>

<template>
    <div class="audit">
        <div class="audit__header">
            <h1>Track image audit</h1>
            <p class="audit__sub">
                {{ trackIds.length }} tracks. Left: results-page banner
                (TrackBanner). Right: home-page "Up Next" card (EventCardLg).
            </p>
        </div>
        <div v-for="id in trackIds" v-bind:key="id" class="audit__row">
            <div class="audit__id">{{ id }}</div>
            <div class="audit__cell audit__cell--banner">
                <TrackBanner v-bind:trackId="id" />
            </div>
            <div class="audit__cell audit__cell--card">
                <EventCardLg
                    v-bind:track_id="id"
                    v-bind:is_next="true"
                    v-bind:date="sampleDate"
                    car_id="0"
                    league_id="0"
                />
            </div>
        </div>
    </div>
</template>

<style scoped>
.audit {
    padding: 1.5rem;
    max-width: 1400px;
    margin: 0 auto;
}
.audit__header {
    margin-bottom: 1.5rem;
}
.audit__sub {
    color: var(--text-muted);
    font-size: var(--text-sm);
}
.audit__row {
    display: grid;
    grid-template-columns: 4rem 1fr 1fr;
    gap: 1rem;
    align-items: start;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--border-subtle);
}
.audit__id {
    font-family: var(--font-mono, monospace);
    color: var(--text-muted);
    padding-top: 0.25rem;
}
.audit__cell {
    min-width: 0;
}
.audit__cell--banner {
    height: 8em;
}
</style>
