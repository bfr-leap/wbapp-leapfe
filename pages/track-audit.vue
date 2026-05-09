<script setup lang="ts">
import EventCardLg from '@@/src/components/event/event-card-lg.vue';
import TrackBanner from '@@/src/components/track/track-banner.vue';

// Derived from `ls public/tracks/*.jpg`. Refresh by running:
//   ls public/tracks/*.jpg | xargs -n1 basename | grep -v _logo | sed 's/.jpg$//'
const trackIds: string[] = [
    'n1',
    '18',
    '20',
    '31',
    '47',
    '53',
    '94',
    '95',
    '103',
    '108',
    '109',
    '121',
    '123',
    '124',
    '127',
    '131',
    '136',
    '144',
    '145',
    '149',
    '152',
    '163',
    '164',
    '166',
    '168',
    '169',
    '178',
    '179',
    '180',
    '191',
    '192',
    '195',
    '198',
    '200',
    '212',
    '214',
    '218',
    '219',
    '225',
    '229',
    '233',
    '234',
    '236',
    '237',
    '239',
    '250',
    '255',
    '266',
    '276',
    '277',
    '319',
    '341',
    '345',
    '349',
    '362',
    '371',
    '390',
    '397',
    '403',
    '413',
    '419',
    '434',
    '435',
    '444',
    '445',
    '448',
    '451',
    '453',
    '463',
    '465',
    '473',
    '474',
    '475',
    '478',
    '485',
    '498',
    '501',
    '509',
    '523',
    '584',
];

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
