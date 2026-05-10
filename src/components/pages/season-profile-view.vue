<script setup lang="ts">
import { ref, watch, watchEffect } from 'vue';
import type { Ref } from 'vue';
import GenericTable from '../vis/generic-table.vue';
import { useRoute } from 'vue-router';

import BarChartUnovis from '@@/src/components/vis/bar-chart-unovis.vue';
import EventCardLg from '@@/src/components/event/event-card-lg.vue';
import EventCardSm from '@@/src/components/event/event-card-sm.vue';
import DriverStandings from '@@/src/components/driver/driver-standings.vue';
import PastEventCards from '@@/src/components/event/past-event-cards.vue';
import LeagueRoster from '@@/src/components/driver/league-roster.vue';
import {
    getChartDataFromStats,
    getDefaultSeasonProfileModel,
    getSeasonProfileModel,
} from '@@/src/models/pages/season-profile-model';
import type { SeasonProfileModel } from '@@/src/models/pages/season-profile-model';

const route = useRoute();
const statSplit = ['Overall', 'Race', 'Sprint'];

async function fetchModel() {
    let leagueId = route.query.league as string;
    let seasonId = route.query.season as string;

    return await getSeasonProfileModel(leagueId, seasonId);
}

const seasonProfileModel: Ref<SeasonProfileModel> =
    await asyncDataWithReactiveModel<SeasonProfileModel>(
        `LeagueSeasonMenuModel-${[
            route.query.league as string,
            route.query.season as string,
        ]
            .map((v) => v.toString())
            .join('-')}`,
        fetchModel,
        getDefaultSeasonProfileModel,
        [() => route.query.league, () => route.query.season]
    );

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
    <div class="page">
        <section class="section">
            <header class="section__head">
                <span class="section__title">Past Events</span>
            </header>
            <PastEventCards
                v-bind:league="seasonProfileModel.leagueId"
                v-bind:season="seasonProfileModel.seasonId"
            >
            </PastEventCards>
        </section>

        <template v-for="split in statSplit">
            <section class="section">
                <header class="section__head">
                    <span class="section__title">{{ split }} Stats</span>
                </header>
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

                <div class="tab-content section-tabs" id="nav-tabContent">
                    <div
                        class="tab-pane fade show active"
                        v-bind:id="`nav-inc-chart-${split}`"
                        role="tabpanel"
                        tabindex="0"
                    >
                        <div class="eyebrow">Incidents per Lap</div>
                        <BarChartUnovis
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

                    <div
                        class="tab-pane fade"
                        v-bind:id="`nav-par-chart-${split}`"
                        role="tabpanel"
                        tabindex="0"
                    >
                        <div class="eyebrow">Number of Participants</div>
                        <BarChartUnovis
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

                    <div
                        class="tab-pane fade"
                        v-bind:id="`nav-sts-table-${split}`"
                        role="tabpanel"
                        tabindex="0"
                    >
                        <GenericTable
                            :title="`Season Stats - ${split}`"
                            :league-id="seasonProfileModel.leagueId"
                            :rows="seasonProfileModel.stats[split]"
                            :season-id="seasonProfileModel.seasonId"
                        />
                    </div>
                </div>
            </section>
        </template>

        <section v-if="seasonProfileModel.nextRace.date !== ''" class="section">
            <header class="section__head">
                <span class="section__title">Future Events</span>
            </header>
            <div v-if="seasonProfileModel.nextRace.date !== ''" class="row g-1">
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
                                    new Date(seasonProfileModel.nextRace.date)
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
                            >
                            </EventCardSm>
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
        </section>

        <DriverStandings
            summary_mode
            v-bind:season="seasonProfileModel.seasonId"
            v-bind:league="seasonProfileModel.leagueId"
        />

        <section class="section">
            <header class="section__head">
                <span class="section__title">League Roster</span>
            </header>
            <LeagueRoster v-bind:league="seasonProfileModel.leagueId" />
        </section>
    </div>
</template>

<style scoped>
.section-tabs {
    margin-top: var(--space-3);
}
</style>
