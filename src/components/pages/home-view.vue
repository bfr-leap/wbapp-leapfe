<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import type { Ref } from 'vue';
import EventCardLg from '@/components/event/event-card-lg.vue';
import EventCardSm from '@/components/event/event-card-sm.vue';
import DriverStandings from '@/components/driver/driver-standings.vue';
import LeagueSeasonMenu from '@/components/nav/league-season-menu.vue';
import PastEventCards from '../event/past-event-cards.vue';
import type { HomeModel } from '@/models/pages/home-model';
import { getDefaultHomeModel, getHomeModel } from '@/models/pages/home-model';

const props = defineProps<{
    league: string;
    season: string;
    subsession: string;
}>();

let homeModel: Ref<HomeModel> = ref(getDefaultHomeModel());

async function fetchModel() {
    homeModel.value = await getHomeModel(props.league, props.season);
}

watchEffect(fetchModel);

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
    <LeagueSeasonMenu
        v-if="homeModel.leagueId && homeModel.seasonId"
        target-page=""
        v-bind:league="homeModel.leagueId"
        v-bind:season="homeModel.seasonId"
    />

    <div
        class="card bg-dark text-light m-2"
        v-if="homeModel.leagueId && homeModel.seasonId"
    >
        <div class="card-body p-2">
            <div class="container">
                Past Events
                <div style="height: 1em"></div>
                <PastEventCards
                    v-bind:league="homeModel.leagueId"
                    v-bind:season="homeModel.seasonId"
                    v-bind:car="homeModel.carId"
                />
                <div style="height: 1em"></div>
            </div>
        </div>
    </div>

    <div v-if="homeModel.nextRace.date" class="card bg-dark text-light m-2">
        <div class="card-body p-2">
            <div class="container">
                <div v-if="homeModel.nextRace.date !== ''" class="row g-1">
                    <div class="col-12 col-sm-3 col-lg-2">
                        <div class="row g-1 flex-sm-column h-100">
                            <div
                                class="col"
                                @click="onClick(homeModel.nextRace)"
                            >
                                <EventCardSm
                                    class="h-100"
                                    v-bind:track_id="homeModel.nextRace.trackId"
                                    v-bind:is_next="true"
                                    v-bind:date="
                                        new Date(homeModel.nextRace.date)
                                    "
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
            </div>
        </div>
    </div>
    <DriverStandings
        v-if="homeModel.seasonId && homeModel.leagueId"
        summary_mode
        v-bind:season="homeModel.seasonId"
        v-bind:league="homeModel.leagueId"
    />

    <div class="card bg-dark text-light m-2">
        <div class="card-body p-2">
            <div class="container">
                <div>
                    <RouterLink
                        v-if="homeModel.seasonId && homeModel.leagueId"
                        class="link-light"
                        v-bind:to="`?m=season&league=${homeModel.leagueId}&season=${homeModel.seasonId}`"
                        >See More Season Details</RouterLink
                    >
                </div>
            </div>
        </div>
    </div>
</template>
