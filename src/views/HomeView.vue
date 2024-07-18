<script setup lang="ts">
import { useRoute } from 'vue-router';
import type { Ref } from 'vue';
import HomeView from '@/components/pages/home-view.vue';
import ResultsView from '@/components/pages/results-view.vue';
import DriverStandingsView from '@/components/pages/driver-standings-view.vue';
import DriverView from '@/components/pages/driver-view.vue';
import TeamView from '@/components/pages/team-view.vue';
import TrackResultsView from '@/components/pages/track-results-view.vue';
import NextEventTimerEmbed from '@/components/embeds/next-event-timer-embed.vue';
import SubsessionSummaryEmbed from '@/components/embeds/subsession-summary-embed.vue';
import SeasonProfile from '@/components/pages/season-profile-view.vue';
import UserProfile from '@/components/pages/user-profile-view.vue';
import { ref, watch } from 'vue';
import mixpanel from 'mixpanel-browser';
import { defLgSeasSubCtx } from '@/utils/fetch-util';

const route = useRoute();

let league: Ref<string> = ref('');
let season: Ref<string> = ref('');
let subsession: Ref<string> = ref('');
let simsession: Ref<string> = ref('');

async function track() {
    // mixpanel.track(route.query.m?.toString() || 'home', route.query);

    const def: any = await defLgSeasSubCtx(
        route.query.league as string,
        route.query.season as string,
        route.query.subsession as string
    );

    league.value = def?.league_id?.toString() || '';
    season.value = def?.season_id?.toString() || '';
    subsession.value = def?.subsession_id?.toString() || '';
    simsession.value = (route.query.simsession as string) || '';
}

track();

watch(route, track);
</script>

<template>
    <HomeView v-if="!route.query.m" v-bind:league="league" v-bind:season="season" v-bind:subsession="subsession">
    </HomeView>
    <ResultsView v-if="route.query.m === 'results'" v-bind:league="league" v-bind:season="season"
        v-bind:subsession="subsession" v-bind:simsession="simsession"></ResultsView>
    <DriverStandingsView v-if="route.query.m === 'standings'"></DriverStandingsView>
    <DriverView v-if="route.query.m === 'driver'"></DriverView>
    <TeamView v-if="route.query.m === 'team'"></TeamView> <!-- this needs help -->
    <TrackResultsView v-if="route.query.m === 'track'"></TrackResultsView>
    <SeasonProfile v-if="route.query.m === 'season'"></SeasonProfile>
    <UserProfile v-if="route.query.m === 'profile'"></UserProfile>

    <NextEventTimerEmbed v-if="route.query.m === 'nextEventTimerEmbed'"></NextEventTimerEmbed>
    <SubsessionSummaryEmbed v-if="route.query.m === 'subsessionSummaryEmbed'"></SubsessionSummaryEmbed>
</template>
