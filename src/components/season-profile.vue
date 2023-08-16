<script setup lang="ts">
import { ref, watch, watchEffect } from 'vue';
import type { Ref } from 'vue';
import GenericTable from './GenericTable.vue';
import { useRoute } from 'vue-router';

import BarChart from './BarChart.vue';
import EventCardLg from '../components/EventCardLg.vue';
import EventCardSm from '../components/EventCardSm.vue';
import DriverStandings from '../components/DriverStandings.vue';
import LeagueSeasonMenu from '@/components/league-season-menu.vue';
import PastEventCards from '../components/past-event-cards.vue';
import {
    getChartDataFromStats,
    getDefaultSeasonProfileModel,
    getSeasonProfileModel,
} from '@/models/season-profile-model';
import type { SeasonProfileModel } from '@/models/season-profile-model';

const route = useRoute();

let seasonProfileModel: Ref<SeasonProfileModel> = ref(
    getDefaultSeasonProfileModel()
);
const statSplit = ['Overall', 'Race', 'Sprint'];

async function fectchModel() {
    let leagueId = route.query.league as string;
    let seasonId = route.query.season as string;

    seasonProfileModel.value = await getSeasonProfileModel(leagueId, seasonId);
}

watchEffect(fectchModel);
watch(route, fectchModel);

function onClick(eventInfo: { trackId: string; date: string }) {
    seasonProfileModel.value.selectedRace = {
        trackId: eventInfo.trackId,
        date: eventInfo.date,
        isSelected: false,
    };

    if (
        seasonProfileModel.value.nextRace.date === eventInfo.date &&
        seasonProfileModel.value.nextRace.trackId === eventInfo.trackId
    ) {
        seasonProfileModel.value.nextRace.isSelected = true;
    } else {
        seasonProfileModel.value.nextRace.isSelected = false;
    }

    for (let race of seasonProfileModel.value.futureRaces) {
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
        v-bind:league="seasonProfileModel.leagueId"
        v-bind:season="seasonProfileModel.seasonId"
    />

    <div class="card bg-dark text-light m-2">
        <div class="card-body p-2">
            <div>Past Events</div>
            <div style="height: 1em"></div>
            <div class="container">
                <PastEventCards
                    v-bind:league="seasonProfileModel.leagueId"
                    v-bind:season="seasonProfileModel.seasonId"
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
                            <div class="col-12 m-auto">incidents per lap</div>
                        </div>
                        <div class="row">
                            <div class="col-12 m-auto">
                                <BarChart
                                    v-if="
                                        getChartDataFromStats(
                                            seasonProfileModel.stats,
                                            'incidents_per_lap',
                                            split
                                        ).length
                                    "
                                    :data="
                                        getChartDataFromStats(
                                            seasonProfileModel.stats,
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
                                number of participants
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-12 m-auto">
                                <BarChart
                                    v-if="
                                        getChartDataFromStats(
                                            seasonProfileModel.stats,
                                            'number_of_participants',
                                            split
                                        ).length
                                    "
                                    :data="
                                        getChartDataFromStats(
                                            seasonProfileModel.stats,
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
                                :league-id="seasonProfileModel.leagueId"
                                :rows="seasonProfileModel.stats[split]"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </template>

    <div
        v-if="seasonProfileModel.nextRace.date !== ''"
        class="card bg-dark text-light m-2"
    >
        <div class="card-body p-2">
            <div class="container">
                <div>Future Events</div>
                <div
                    v-if="seasonProfileModel.nextRace.date !== ''"
                    class="row g-1"
                >
                    <div class="col-12 col-sm-3 col-lg-2">
                        <div class="row g-1 flex-sm-column h-100">
                            <div
                                class="col"
                                @click="onClick(seasonProfileModel.nextRace)"
                            >
                                <EventCardSm
                                    class="h-100"
                                    v-bind:track_id="
                                        seasonProfileModel.nextRace.trackId
                                    "
                                    v-bind:is_next="true"
                                    v-bind:date="
                                        new Date(
                                            seasonProfileModel.nextRace.date
                                        )
                                    "
                                    v-bind:is_selected="
                                        seasonProfileModel.nextRace.isSelected
                                    "
                                ></EventCardSm>
                            </div>
                            <div
                                v-for="race in seasonProfileModel.futureRaces"
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
                                seasonProfileModel.selectedRace.trackId.toString()
                            "
                            v-bind:car_id="seasonProfileModel.carId"
                            v-bind:league_id="seasonProfileModel.leagueId"
                            v-bind:is_next="false"
                            v-bind:date="
                                new Date(seasonProfileModel.selectedRace.date)
                            "
                        ></EventCardLg>
                    </div>
                </div>
                <div v-else>No Future Events</div>
            </div>
        </div>
    </div>
    <DriverStandings
        summary_mode
        v-bind:season="seasonProfileModel.seasonId"
        v-bind:league="seasonProfileModel.leagueId"
    />
</template>
