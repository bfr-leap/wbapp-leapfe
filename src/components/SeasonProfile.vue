<script setup lang="ts">
import { ref, watch, watchEffect } from 'vue';
import type { Ref } from 'vue';
import {
    getCuratedActiveLeagueSchedule,
    getLeagueSimsessionIndex,
    getLeagueSeasonSessions,
} from '../fetch-util';
import GenericTable from './GenericTable.vue';
import { useRoute } from 'vue-router';

import BarChart from './BarChart.vue';
import EventCardLg from '../components/EventCardLg.vue';
import EventCardSm from '../components/EventCardSm.vue';
import DriverStandings from '../components/DriverStandings.vue';
import LeagueSeasonMenu from '../components/LeagueSeasonMenu.vue';
import PastEventCards from '../components/PastEventCards.vue';
import { getSessionStats } from '@/results-util';

const route = useRoute();

interface ScheduleView {
    leagueName: string;
    leagueId: string;
    seasonId: string;
    nextRace: { trackId: string; date: string; isSelected: boolean };
    selectedRace: { trackId: string; date: string; isSelected: boolean };
    futureRaces: { trackId: string; date: string; isSelected: boolean }[];
    stats: {
        [name: string]: {
            [name: string]: string;
        }[];
    };
}

let defaultVue: ScheduleView = {
    leagueName: '----',
    leagueId: '0',
    seasonId: '0',
    nextRace: { trackId: '0', date: '', isSelected: false },
    selectedRace: { trackId: '0', date: '', isSelected: false },
    futureRaces: [],
    stats: { Overall: [], Race: [], Sprint: [] },
};

let schedule: Ref<ScheduleView> = ref(JSON.parse(JSON.stringify(defaultVue)));
let leagueId: Ref<string> = ref('');
let seasonId: Ref<string> = ref('');
let carId: Ref<string> = ref('');
const chartFields = ['incidents_per_lap', 'number_of_participants'];
const statSplit = ['Overall', 'Race', 'Sprint'];
const barChartData: Ref<{ name: string; value: number }[] | null> = ref(null);

function getChartDataFromStats(
    stat: string,
    split: string
): { name: string; value: number }[] {
    let data: { name: string; value: number }[] = [];

    let round = 1;

    for (let row of schedule.value.stats[split]) {
        data.push({
            name: `R${round++}`,
            value: Number.parseFloat(row[stat]),
        });
    }

    // the last data item is the total/average, remove it
    data.pop();

    return data;
}

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
        for (let split of statSplit) {
            let roundNum = 0;
            let totalParticipation = 0;
            let totalLaps = 0;
            let totalIncidents = 0;
            let totalIpL = 0;

            for (let session of leagueSeasonSessions.sessions) {
                session.track.track_id;
                session.launch_at;

                let sessionStats = await getSessionStats(
                    leagueId.value,
                    seasonId.value,
                    session.subsession_id.toString(),
                    split
                );

                if (sessionStats.race_number_of_laps > 0) {
                    totalParticipation += sessionStats.race_participants;
                    totalLaps += sessionStats.race_number_of_laps;
                    totalIncidents += sessionStats.race_incident_count;
                    schedule.value.stats[split].push({
                        session: `R${++roundNum}`,
                        number_of_participants:
                            sessionStats.race_participants.toString(),
                        number_of_laps:
                            sessionStats.race_number_of_laps.toString(),
                        number_of_incidents:
                            sessionStats.race_incident_count.toString(),
                        incidents_per_lap: (
                            sessionStats.race_incident_count /
                            sessionStats.race_number_of_laps
                        ).toFixed(2),
                    });
                }
            }

            schedule.value.stats[split].push({
                session: `total/average`,
                number_of_participants: (totalParticipation / roundNum).toFixed(
                    2
                ),
                number_of_laps: totalLaps.toString(),
                number_of_incidents: totalIncidents.toString(),
                incidents_per_lap: (totalIncidents / totalLaps).toFixed(2),
            });
        }
    }

    if (curatedSeasonInfo) {
        carId.value = curatedSeasonInfo.car_id.toString();

        let events = curatedSeasonInfo.events
            .filter((e) => new Date(e.time).getTime() > now)
            .filter((v, i) => i < 4);

        if (events.length > 0) {
            schedule.value.nextRace = schedule.value.selectedRace = {
                trackId: events[0].track_id.toString(),
                date: events[0].time,
                isSelected: true,
            };
        }

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
            <div>Past Events</div>
            <div style="height: 1em"></div>
            <div class="container">
                <PastEventCards
                    v-bind:league="leagueId"
                    v-bind:season="seasonId"
                ></PastEventCards>
            </div>
            <div style="height: 1em"></div>
        </div>
    </div>

    <template v-for="split in statSplit">
        <div class="card bg-dark text-light m-2">
            <div class="card-body p-2">
                <div class="row">
                    <div class="col-12 m-auto">{{ split }} Stats</div>
                </div>
                <div style="height: 1em"></div>
                <ul class="nav nav-pills">
                    <li class="nav-item dropdown">
                        <a
                            class="nav-link dropdown-toggle active show"
                            data-bs-toggle="dropdown"
                            href="#"
                            role="button"
                            aria-expanded="false"
                            >Charts</a
                        >
                        <ul class="dropdown-menu">
                            <li>
                                <a
                                    class="dropdown-item active"
                                    data-bs-toggle="tab"
                                    v-bind:data-bs-target="`#nav-inc-chart-${split}`"
                                    href="#"
                                >
                                    Incidents per Lap
                                </a>
                            </li>
                            <li>
                                <a
                                    class="dropdown-item"
                                    data-bs-toggle="tab"
                                    v-bind:data-bs-target="`#nav-par-chart-${split}`"
                                    href="#"
                                >
                                    Number of Participants
                                </a>
                            </li>
                        </ul>
                    </li>
                    <li class="nav-item dropdown">
                        <a
                            class="nav-link dropdown-toggle"
                            data-bs-toggle="dropdown"
                            href="#"
                            role="button"
                            aria-expanded="false"
                            >Tables</a
                        >
                        <ul class="dropdown-menu">
                            <li>
                                <a
                                    class="dropdown-item"
                                    data-bs-toggle="tab"
                                    v-bind:data-bs-target="`#nav-sts-table-${split}`"
                                    href="#"
                                >
                                    Season Stats
                                </a>
                            </li>
                        </ul>
                    </li>
                </ul>

                <div style="height: 2em"></div>
                <div class="tab-content" id="nav-tabContent">
                    <div
                        class="tab-pane fade show active"
                        v-bind:id="`nav-inc-chart-${split}`"
                        role="tabpanel"
                        aria-labelledby="nav-home-tab"
                        tabindex="0"
                    >
                        <div class="row">
                            <div class="col-12 m-auto">
                                {{ 'incidents_per_lap'.replaceAll('_', ' ') }}
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-12 m-auto">
                                <BarChart
                                    v-if="
                                        getChartDataFromStats(
                                            'incidents_per_lap',
                                            split
                                        ).length
                                    "
                                    :data="
                                        getChartDataFromStats(
                                            'incidents_per_lap',
                                            split
                                        )
                                    "
                                />
                            </div>
                        </div>
                    </div>

                    <div
                        class="tab-pane fade"
                        v-bind:id="`nav-par-chart-${split}`"
                        role="tabpanel"
                        aria-labelledby="nav-home-tab"
                        tabindex="0"
                    >
                        <div class="row">
                            <div class="col-12 m-auto">
                                {{
                                    'number_of_participants'.replaceAll(
                                        '_',
                                        ' '
                                    )
                                }}
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-12 m-auto">
                                <BarChart
                                    v-if="
                                        getChartDataFromStats(
                                            'number_of_participants',
                                            split
                                        ).length
                                    "
                                    :data="
                                        getChartDataFromStats(
                                            'number_of_participants',
                                            split
                                        )
                                    "
                                />
                            </div>
                        </div>
                    </div>

                    <div
                        class="tab-pane fade"
                        v-bind:id="`nav-sts-table-${split}`"
                        role="tabpanel"
                        aria-labelledby="nav-home-tab"
                        tabindex="0"
                    >
                        <div class="row">
                            <GenericTable
                                :title="`Season Stats - ${split}`"
                                :rows="schedule.stats[split]"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </template>

    <div
        v-if="schedule.nextRace.date !== ''"
        class="card bg-dark text-light m-2"
    >
        <div class="card-body p-2">
            <div class="container">
                <div>Future Events</div>
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
