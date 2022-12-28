<script setup lang="ts">
import { ref, watch, watchEffect } from 'vue';
import type { Ref } from 'vue';
import { getActiveLeagueSchedule } from '../fetch-util';
import type { ActiveLeagueSchedule } from '@/iracing-endpoints';
import { useRoute } from 'vue-router';

import EventCardLg from '../components/EventCardLg.vue';
import EventCardSm from '../components/EventCardSm.vue';
import DriverStandings from '../components/DriverStandings.vue';
import LeagueSeasonMenu from '../components/LeagueSeasonMenu.vue';

const route = useRoute();

interface ScheduleView {
    leagueName: string;
    nextRace: { trackId: string; date: string; isSelected: boolean };
    selectedRace: { trackId: string; date: string; isSelected: boolean };
    futureRaces: { trackId: string; date: string; isSelected: boolean }[];
}

let defaultVue = {
    leagueName: '----',
    nextRace: { trackId: '0', date: '', isSelected: false },
    selectedRace: { trackId: '0', date: '', isSelected: false },
    futureRaces: [],
};

let schedule: Ref<ScheduleView> = ref(JSON.parse(JSON.stringify(defaultVue)));
let leagueId: Ref<string> = ref('');
let seasonId: Ref<string> = ref('');
let carId: Ref<string> = ref('');

async function fectchJsonData() {
    let now: number = new Date().getTime();

    console.log('home view');

    let s = await getActiveLeagueSchedule();

    leagueId.value = route.query.league as string;
    seasonId.value = route.query.season as string;

    if (!leagueId.value) {
        leagueId.value = s.leagues[0].league_id.toString();
    }

    if (!seasonId.value) {
        seasonId.value = s.leagues[0].seasons[0].season_id.toString();
    }

    let selectedLeague = s.leagues.find(
        (l) => l.league_id.toString() === leagueId.value
    );
    let selectedSeason = selectedLeague?.seasons.find(
        (s) => s.season_id.toString() === seasonId.value
    );

    if (!selectedLeague || !selectedSeason) {
        schedule.value = JSON.parse(JSON.stringify(defaultVue));
        return;
    }

    carId.value = selectedSeason.car_id.toString();

    let events = selectedSeason.events
        .filter((e) => new Date(e.time).getTime() > now)
        .filter((v, i) => i < 4);

    schedule.value.nextRace = schedule.value.selectedRace = {
        trackId: events[0].track_id.toString(),
        date: events[0].time,
        isSelected: true,
    };

    schedule.value.futureRaces = [];
    for (let i = 1; i < events.length; ++i) {
        schedule.value.futureRaces.push({
            trackId: events[i].track_id.toString(),
            date: events[i].time,
            isSelected: false,
        });
    }
}
watchEffect(fectchJsonData);
watch(route, fectchJsonData);

function onClick(eventInfo: { trackId: string; date: string }) {
    schedule.value.selectedRace = {
        trackId: eventInfo.trackId,
        date: eventInfo.date,
        isSelected: false,
    };

    if (
        schedule.value.nextRace.date === eventInfo.date &&
        schedule.value.nextRace.trackId === eventInfo.trackId
    ) {
        schedule.value.nextRace.isSelected = true;
    } else {
        schedule.value.nextRace.isSelected = false;
    }

    for (let race of schedule.value.futureRaces) {
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
        target-page=""
        v-bind:league="leagueId"
        v-bind:season="seasonId"
    />

    <div class="card bg-dark text-light m-2">
        <div class="card-body p-2">
            <div class="container">
                <div v-if="schedule.nextRace.date !== ''" class="row">
                    <div class="col-2">
                        <div class="row" @click="onClick(schedule.nextRace)">
                            <EventCardSm
                                v-bind:track_id="schedule.nextRace.trackId"
                                v-bind:is_next="true"
                                v-bind:date="new Date(schedule.nextRace.date)"
                                v-bind:is_selected="
                                    schedule.nextRace.isSelected
                                "
                            ></EventCardSm>
                        </div>
                        <div
                            v-for="race in schedule.futureRaces"
                            class="row"
                            @click="onClick(race)"
                        >
                            <EventCardSm
                                v-bind:track_id="race.trackId"
                                v-bind:is_next="false"
                                v-bind:date="new Date(race.date)"
                                v-bind:is_selected="race.isSelected"
                            ></EventCardSm>
                        </div>
                    </div>
                    <div class="col-10">
                        <EventCardLg
                            v-bind:track_id="
                                schedule.selectedRace.trackId.toString()
                            "
                            v-bind:car_id="carId"
                            v-bind:league_id="leagueId"
                            v-bind:is_next="false"
                            v-bind:date="new Date(schedule.selectedRace.date)"
                        ></EventCardLg>
                    </div>
                </div>
                <div v-else>No Future Events</div>
            </div>
        </div>
    </div>
    <DriverStandings
        summary_mode
        v-bind:season="(route.query.season as string)"
        v-bind:league="(route.query.league as string)"
    />
</template>
