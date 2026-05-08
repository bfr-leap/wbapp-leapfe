<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import type { Ref } from 'vue';
import EventCardLg from '@@/src/components/event/event-card-lg.vue';
import EventCardSm from '@@/src/components/event/event-card-sm.vue';
import DriverStandings from '@@/src/components/driver/driver-standings.vue';
import DriverSpotlight from '@@/src/components/driver/driver-spotlight.vue';
import PastEventCards from '../event/past-event-cards.vue';
import LatestRaceSummary from '../event/latest-race-summary.vue';
import type { HomeModel } from '@@/src/models/pages/home-model';
import {
    getDefaultHomeModel,
    getHomeModel,
} from '@@/src/models/pages/home-model';
import { SignedIn, SignedOut, SignInButton } from 'vue-clerk';
import { useAuth } from 'vue-clerk';
import RouterLinkProxy from '@@/src/components/nav/router-link-proxy.vue';

const { isSignedIn } = useAuth();

const props = defineProps<{
    league: string;
    season: string;
    subsession: string;
}>();

async function fetchModel() {
    return await getHomeModel(
        props.league,
        props.season,
        isSignedIn.value === true
    );
}

const homeModel: Ref<HomeModel> = await asyncDataWithReactiveModel<HomeModel>(
    `homeViewPageModel-${[props.league, props.season, isSignedIn.value === true]
        .map((v) => v.toString())
        .join('-')}`,
    fetchModel,
    getDefaultHomeModel,
    [() => props.league, () => props.season, () => props.subsession]
);

function onClick(eventInfo: { trackId: string; date: string }) {
    homeModel.value.selectedRace = {
        trackId: eventInfo.trackId,
        date: eventInfo.date,
        isSelected: false,
    };

    if (
        homeModel.value.nextRace.date === eventInfo.date &&
        homeModel.value.nextRace.trackId === eventInfo.trackId
    ) {
        homeModel.value.nextRace.isSelected = true;
    } else {
        homeModel.value.nextRace.isSelected = false;
    }

    for (let race of homeModel.value.futureRaces) {
        if (
            race.date === eventInfo.date &&
            race.trackId === eventInfo.trackId
        ) {
            race.isSelected = true;
        } else {
            race.isSelected = false;
        }
    }
}
</script>

<template>
    <div class="page">
        <section
            v-if="homeModel.leagueId && homeModel.seasonId"
            class="section"
        >
            <header class="section__head">
                <span class="section__title">Past Events</span>
            </header>
            <PastEventCards
                v-bind:league="homeModel.leagueId"
                v-bind:season="homeModel.seasonId"
                v-bind:car="homeModel.carId"
            />
        </section>

        <LatestRaceSummary
            v-if="homeModel.leagueId && homeModel.seasonId"
            v-bind:league="homeModel.leagueId"
            v-bind:season="homeModel.seasonId"
        />

        <section
            v-if="homeModel.nextRace.date"
            class="section section--featured"
        >
            <header class="section__head">
                <span class="section__title">Up Next</span>
                <SignedIn>
                    <RouterLinkProxy
                        v-if="homeModel.allowEditCalendar"
                        class="section__more"
                        type="button"
                        v-bind:to="`/?m=season-cdr-admin&league=${$props.league}&season=${$props.season}`"
                    >
                        Edit Calendar
                    </RouterLinkProxy>
                </SignedIn>
            </header>
            <div v-if="homeModel.nextRace.date !== ''" class="row g-1">
                <div class="col-12 col-sm-3 col-lg-2">
                    <div class="row g-1 flex-sm-column h-100 event-strip">
                        <div class="col" @click="onClick(homeModel.nextRace)">
                            <EventCardSm
                                class="h-100"
                                v-bind:track_id="homeModel.nextRace.trackId"
                                v-bind:is_next="true"
                                v-bind:date="new Date(homeModel.nextRace.date)"
                                v-bind:is_selected="
                                    homeModel.nextRace.isSelected
                                "
                            ></EventCardSm>
                        </div>
                        <div
                            v-for="race in homeModel.futureRaces"
                            class="col"
                            @click="onClick(race)"
                        >
                            <EventCardSm
                                class="h-100"
                                v-bind:track_id="race.trackId"
                                v-bind:is_next="false"
                                v-bind:date="new Date(race.date)"
                                v-bind:is_selected="race.isSelected"
                            >
                            </EventCardSm>
                        </div>
                    </div>
                </div>
                <div class="col-12 col-sm-9 col-lg-10">
                    <EventCardLg
                        v-bind:track_id="
                            homeModel.selectedRace?.trackId?.toString()
                        "
                        v-bind:car_id="homeModel.carId"
                        v-bind:league_id="homeModel.leagueId"
                        v-bind:is_next="false"
                        v-bind:date="new Date(homeModel.selectedRace.date)"
                    ></EventCardLg>
                </div>
            </div>
            <div v-else>No Future Events</div>
        </section>

        <DriverSpotlight
            v-if="homeModel.seasonId && homeModel.leagueId"
            :key="`sp-${homeModel.leagueId}-${homeModel.seasonId}`"
            v-bind:league="homeModel.leagueId"
            v-bind:season="homeModel.seasonId"
        />

        <DriverStandings
            v-if="homeModel.seasonId && homeModel.leagueId"
            :key="`ds-${homeModel.leagueId}-${homeModel.seasonId}`"
            summary_mode
            v-bind:season="homeModel.seasonId"
            v-bind:league="homeModel.leagueId"
        />

        <section class="section">
            <RouterLinkProxy
                v-if="homeModel.seasonId && homeModel.leagueId"
                class="section__more"
                v-bind:to="`?m=season&league=${homeModel.leagueId}&season=${homeModel.seasonId}`"
                >See More Season Details →</RouterLinkProxy
            >
        </section>
    </div>
</template>

<style scoped>
/* Make the small-event-card column stretch its children to fill
   the height of the EventCardLg next to it. Bootstrap's .col with
   flex:1 0 0% in a column-direction flex container distributes
   space, but height:100% on a grandchild (the EventCardSm wrapper)
   doesn't always resolve in nested flex layouts — making each
   .col itself a flex column whose child grows to fill makes the
   stretch reliable across browsers. */
@media (min-width: 576px) {
    .event-strip > .col {
        display: flex;
        flex-direction: column;
    }
    .event-strip > .col > * {
        flex: 1 1 auto;
        min-height: 0;
    }
}
</style>
