<script setup lang="ts">
import { ref, watch, watchEffect } from 'vue';
import type { Ref } from 'vue';
import {
    getCuratedActiveLeagueSchedule,
    getLeagueSimsessionIndex,
    getLeagueSeasonSessions,
} from '../fetch-util';
import { getTrackName, guessTrackIdfromEventName } from '../track-utils';
import type {
    ActiveLeagueSchedule,
    SeasonSimsessionIndex,
} from '@/iracing-endpoints';
import { useRoute } from 'vue-router';

import EventCardLg from '../components/EventCardLg.vue';
import EventCardSm from '../components/EventCardSm.vue';
import DriverStandings from '../components/DriverStandings.vue';
import LeagueSeasonMenu from '../components/LeagueSeasonMenu.vue';

const route = useRoute();

interface ScheduleView {
    leagueName: string;
    leagueId: string;
    seasonId: string;
    nextRace: { trackId: string; date: string; isSelected: boolean };
    selectedRace: { trackId: string; date: string; isSelected: boolean };
    futureRaces: { trackId: string; date: string; isSelected: boolean }[];
    pastRaces: {
        sessionId: string;
        trackId: string;
        date: string;
        isSelected: boolean;
    }[];
}

let defaultVue: ScheduleView = {
    leagueName: '----',
    leagueId: '0',
    seasonId: '0',
    nextRace: { trackId: '0', date: '', isSelected: false },
    selectedRace: { trackId: '0', date: '', isSelected: false },
    futureRaces: [],
    pastRaces: [],
};

let schedule: Ref<ScheduleView> = ref(JSON.parse(JSON.stringify(defaultVue)));
let leagueId: Ref<string> = ref('');
let seasonId: Ref<string> = ref('');
let carId: Ref<string> = ref('');

async function fectchJsonData() {
    schedule.value = JSON.parse(JSON.stringify(defaultVue));
    let now: number = new Date().getTime();

    let curatedSchedule = await getCuratedActiveLeagueSchedule();

    leagueId.value = route.query.league as string;
    seasonId.value = route.query.season as string;

    if (!leagueId.value) {
        leagueId.value = curatedSchedule.leagues[0].league_id.toString();
    }

    if (!seasonId.value) {
        seasonId.value =
            curatedSchedule.leagues[0].seasons[0].season_id.toString();
    }

    let curatedLeagueInfo = curatedSchedule.leagues.find(
        (l) => l.league_id.toString() === leagueId.value
    );
    let curatedSeasonInfo = curatedLeagueInfo?.seasons.find(
        (s) => s.season_id.toString() === seasonId.value
    );

    schedule.value.leagueId = seasonId.value;
    schedule.value.seasonId = seasonId.value;

    let leagueSeasonsSimsessionIndex = await getLeagueSimsessionIndex(
        leagueId.value
    );

    let seasonSimsessions = leagueSeasonsSimsessionIndex.find(
        (s) => s.season_id.toString() === seasonId.value
    );

    let leagueSeasonSessions = await getLeagueSeasonSessions(
        leagueId.value,
        seasonId.value
    );

    if (seasonSimsessions) {
        for (let session of leagueSeasonSessions.sessions) {
            session.track.track_id;
            session.launch_at;

            schedule.value.pastRaces.push({
                trackId: session.track.track_id.toString(),
                date: session.launch_at,
                isSelected: false,
                sessionId: session.subsession_id.toString(),
            });
        }
    }

    if (curatedSeasonInfo) {
        carId.value = curatedSeasonInfo.car_id.toString();

        let events = curatedSeasonInfo.events
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
        target-page="season"
        v-bind:league="leagueId"
        v-bind:season="seasonId"
    />

    <div class="card bg-dark text-light m-2">
        <div class="card-body p-2">
            <div class="container">
                <div class="row g-1">
                    <div class="col-12">
                        <!-- <div class="col-12 col-sm-3 col-lg-3"> -->
                        <!-- asdf   row g-1 flex-sm-column h-100 -->
                        <div class="row g-1 h-100">
                            <div v-for="race in schedule.pastRaces" class="col">
                                <RouterLink
                                    style="text-decoration: none"
                                    class="link-light"
                                    v-bind:to="`?m=results&league=${schedule.leagueId}&season=${schedule.seasonId}&subsession=${race.sessionId}&simsession=0`"
                                >
                                    <EventCardSm
                                        class="h-100"
                                        v-bind:track_id="race.trackId"
                                        v-bind:is_next="false"
                                        v-bind:date="new Date(race.date)"
                                        v-bind:is_selected="race.isSelected"
                                    ></EventCardSm>
                                </RouterLink>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div
        v-if="schedule.nextRace.date !== ''"
        class="card bg-dark text-light m-2"
    >
        <div class="card-body p-2">
            <div class="container">
                <div v-if="schedule.nextRace.date !== ''" class="row g-1">
                    <div class="col-12 col-sm-3 col-lg-2">
                        <div class="row g-1 flex-sm-column h-100">
                            <div
                                class="col"
                                @click="onClick(schedule.nextRace)"
                            >
                                <EventCardSm
                                    class="h-100"
                                    v-bind:track_id="schedule.nextRace.trackId"
                                    v-bind:is_next="true"
                                    v-bind:date="
                                        new Date(schedule.nextRace.date)
                                    "
                                    v-bind:is_selected="
                                        schedule.nextRace.isSelected
                                    "
                                ></EventCardSm>
                            </div>
                            <div
                                v-for="race in schedule.futureRaces"
                                class="col"
                                @click="onClick(race)"
                            >
                                <EventCardSm
                                    class="h-100"
                                    v-bind:track_id="race.trackId"
                                    v-bind:is_next="false"
                                    v-bind:date="new Date(race.date)"
                                    v-bind:is_selected="race.isSelected"
                                ></EventCardSm>
                            </div>
                        </div>
                    </div>
                    <div class="col-12 col-sm-9 col-lg-10">
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
        v-bind:season="seasonId"
        v-bind:league="leagueId"
    />
</template>
