<script setup lang="ts">
import { useRoute } from 'vue-router';
import type { Ref } from 'vue';
import HomeView from '@@/src/components/pages/home-view.vue';
import ResultsView from '@@/src/components/pages/results-view.vue';
import DriverStandingsView from '@@/src/components/pages/driver-standings-view.vue';
import DriverView from '@@/src/components/pages/driver-view.vue';
import TeamView from '@@/src/components/pages/team-view.vue';
import TrackResultsView from '@@/src/components/pages/track-results-view.vue';
import NextEventTimerEmbed from '@@/src/components/embeds/next-event-timer-embed.vue';
import SubsessionSummaryEmbed from '@@/src/components/embeds/subsession-summary-embed.vue';
import SeasonProfile from '@@/src/components/pages/season-profile-view.vue';
import UserProfile from '@@/src/components/pages/user-profile-view.vue';
import SeasonCdrAdmin from '@@/src/components/pages/season-cdr-admin-view.vue';
import { ref, watch } from 'vue';
import mixpanel from 'mixpanel-browser';
import { defLgSeasSubCtx } from '@@/src/utils/fetch-util';

const route = useRoute();

async function track() {
    // mixpanel.track(route.query.m?.toString() || 'home', route.query);

	console.log("from route", route.query.subsession as string);

    const def: any = await defLgSeasSubCtx(
        route.query.league as string,
        route.query.season as string,
        route.query.subsession as string
    );

    def.simsession_id = (route.query.simsession as string) || '';

	console.log("loaded model", JSON.stringify(def));

    return def;
}

interface LgSeasSubCtx {
    league_id: number;
    season_id: number;
    subsession_id: number;
    simsession_id: number;
}

function getDefaultModel() {
    return {
        league_id: 4534,
        season_id: 111025,
        subsession_id: 71222316,
        simsession_id: 0,
    };
}

const lgSeasSubCtx: Ref<LgSeasSubCtx> =
    await asyncDataWithReactiveModel<LgSeasSubCtx>(
        `LgSeasSubCtx-${[
            route.query.league as string,
            route.query.season as string,
            route.query.subsession as string,
        ].join('-')}`,
        track,
        getDefaultModel,
        [route]
    );
</script>

<template>
    <HomeView
        v-if="!route.query.m"
        v-bind:league="lgSeasSubCtx?.league_id?.toString()"
        v-bind:season="lgSeasSubCtx?.season_id?.toString()"
        v-bind:subsession="lgSeasSubCtx?.subsession_id?.toString()"
    >
    </HomeView>
    <ResultsView
        v-if="route.query.m === 'results'"
        v-bind:league="lgSeasSubCtx.league_id?.toString()"
        v-bind:season="lgSeasSubCtx.season_id?.toString()"
        v-bind:subsession="lgSeasSubCtx.subsession_id?.toString()"
        v-bind:simsession="lgSeasSubCtx.simsession_id?.toString()"
    ></ResultsView>
    <DriverStandingsView
        v-if="route.query.m === 'standings'"
    ></DriverStandingsView>
    <DriverView v-if="route.query.m === 'driver'"></DriverView>
    <TeamView v-if="route.query.m === 'team'"></TeamView>
    <!-- this needs help -->
    <TrackResultsView v-if="route.query.m === 'track'"></TrackResultsView>
    <SeasonProfile v-if="route.query.m === 'season'"></SeasonProfile>
    <UserProfile v-if="route.query.m === 'profile'"></UserProfile>

    <SeasonCdrAdmin
        v-if="route.query.m === 'season-cdr-admin'"
        v-bind:league="lgSeasSubCtx.league_id.toString()"
        v-bind:season="lgSeasSubCtx.season_id.toString()"
    ></SeasonCdrAdmin>

    <NextEventTimerEmbed
        v-if="route.query.m === 'nextEventTimerEmbed'"
    ></NextEventTimerEmbed>
    <SubsessionSummaryEmbed
        v-if="route.query.m === 'subsessionSummaryEmbed'"
    ></SubsessionSummaryEmbed>
</template>
