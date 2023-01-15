<script setup lang="ts">
import { useRoute } from 'vue-router';

import HomeView from '../components/HomeView.vue';
import ResultsView from '../components/ResultsView.vue';
import DriverStandingsView from '../components/DriverStandingsView.vue';
import DriverView from '../components/DriverView.vue';
import TrackResultsView from '../components/TrackResultsView.vue';
import NextEventTimerEmbed from '@/components/NextEventTimerEmbed.vue';
import { watch } from 'vue';
import mixpanel from 'mixpanel-browser';

const route = useRoute();

function track() {
    mixpanel.track(route.query.m?.toString() || 'home', route.query);
}

track();
watch(() => route.params, track);
</script>

<template>
    <HomeView v-if="!route.query.m"></HomeView>
    <ResultsView v-if="route.query.m === 'results'"></ResultsView>
    <DriverStandingsView
        v-if="route.query.m === 'standings'"
    ></DriverStandingsView>
    <DriverView v-if="route.query.m === 'driver'"></DriverView>
    <TrackResultsView v-if="route.query.m === 'track'"></TrackResultsView>
    <NextEventTimerEmbed v-if="route.query.m === 'nextEventTimerEmbed'" />
</template>
