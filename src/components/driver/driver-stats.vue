<script setup lang="ts">
import { RouterLink } from 'vue-router';
import ResultsTable from '@@/src/components/event/results-table.vue';
import type {
    DriverStats,
    DriverResults,
} from '@@/lplib/endpoint-types/iracing-endpoints';
import BarChart from '@@/src/components/vis/bar-chart.vue';
import HLBarChart from '../vis/hl-bar-chart.vue';
import { ref, watchEffect } from 'vue';
import type { Ref } from 'vue';
import {
    getDriverStatsModel,
    getDefaultDriverStatsModel,
} from '@@/src/models/driver/driver-stats-model';
import type { DriverStatsModel } from '@@/src/models/driver/driver-stats-model';

import RouterLinkProxy from '@@/src/components/nav/router-link-proxy.vue';

export interface ResultsCollection {
    race: DriverResults;
    sprint: DriverResults;
    quali: DriverResults;
}

const props = defineProps<{
    stats: DriverStats;
    results: {
        race: DriverResults;
        sprint: DriverResults;
        quali: DriverResults;
    };
    seasonName: string;
    leagueId: string;
    seasonId: number;
}>();

async function fetchModel() {
    return await getDriverStatsModel(
        props.results.quali,
        props.results?.race,
        props.results?.sprint,
        props.seasonId,
        props.leagueId
    );
}
watchEffect(fetchModel);

const driverStatsModel: Ref<DriverStatsModel> =
    await asyncDataWithReactiveModel<DriverStatsModel>(
        `DriverStatsModel-${[
            props.results.quali,
            props.results?.race,
            props.results?.sprint,
            props.seasonId,
            props.leagueId,
        ]
            .map((v) => v.toString)
            .join('-')}`,
        fetchModel,
        getDefaultDriverStatsModel,
        [
            () => props.stats,
            () => props.results,
            () => props.seasonName,
            () => props.leagueId,
            () => props.seasonId,
        ]
    );

const statClasses = 'px-2 py-1 m-1 fs-5';
</script>

<template>
    <div class="fs-4">
        <RouterLinkProxy
            class="link-light"
            v-if="props.seasonId"
            :to="`/?m=standings&league=${props.leagueId}&season=${props.seasonId}`"
            >{{ props.seasonName }}</RouterLinkProxy
        >
        <span v-else>{{ driverStatsModel.seasonName }}</span>
    </div>
    <div class="d-flex flex-wrap">
        <div :class="statClasses">
            <span class="name">Starts: </span
            ><span class="value"> {{ props.stats.started }}</span>
        </div>
        <div :class="statClasses">
            <span class="name">Poles: </span
            ><span class="value"> {{ props.stats.poles }}</span>
        </div>
        <div :class="statClasses">
            <span class="name">Wins: </span
            ><span class="value"> {{ props.stats.wins }}</span>
        </div>
        <div :class="statClasses">
            <span class="name">Podiums: </span
            ><span class="value"> {{ props.stats.podiums }}</span>
        </div>
        <div :class="statClasses">
            <span class="name">Top 10: </span
            ><span class="value"> {{ props.stats.top_10 }}</span>
        </div>
        <div :class="statClasses">
            <span class="name">Top 20: </span
            ><span class="value"> {{ props.stats.top_20 }}</span>
        </div>
        <div :class="statClasses">
            <span class="name">LEAP Points: </span
            ><span class="value"> {{ props.stats.power_points }}</span>
        </div>
    </div>

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
                        v-bind:data-bs-target="`#nav-qpchart-${props.seasonId}`"
                        href="#"
                    >
                        Qualifying Performance
                    </a>
                </li>
                <li>
                    <a
                        class="dropdown-item"
                        data-bs-toggle="tab"
                        v-bind:data-bs-target="`#nav-sechart-${props.seasonId}`"
                        href="#"
                    >
                        Start / Finish
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
                <template v-for="(result, i) in props.results">
                    <li v-if="result && result[props.seasonId]">
                        <a
                            class="dropdown-item"
                            data-bs-toggle="tab"
                            v-bind:data-bs-target="`#nav-${i}-${props.seasonId}`"
                            href="#"
                        >
                            {{ i }}
                        </a>
                    </li>
                </template>
            </ul>
        </li>
    </ul>
    <div class="tab-content" id="nav-tabContent">
        <div
            class="tab-pane fade show active"
            v-bind:id="`nav-qpchart-${props.seasonId}`"
            role="tabpanel"
            aria-labelledby="nav-home-tab"
            tabindex="0"
        >
            <div class="row">
                <div class="col-12 m-auto">Qualifying Performance</div>
            </div>
            <div class="row">
                <div class="col-12 m-auto">
                    <BarChart
                        v-if="driverStatsModel.qualifyingChartData"
                        :data="driverStatsModel.qualifyingChartData"
                    />
                </div>
            </div>
        </div>
        <div
            class="tab-pane fade"
            v-bind:id="`nav-sechart-${seasonId}`"
            role="tabpanel"
            aria-labelledby="nav-home-tab"
            tabindex="0"
        >
            <div class="row">
                <div class="col-12 m-auto">Start / Finish</div>
            </div>
            <div class="row">
                <div class="col-12 m-auto">
                    <HLBarChart
                        v-if="driverStatsModel.startFinishChartData"
                        v-bind:data="driverStatsModel.startFinishChartData"
                    />
                </div>
            </div>
        </div>
        <template v-for="(result, i) in props.results">
            <div
                class="tab-pane fade"
                v-bind:id="`nav-${i}-${props.seasonId}`"
                role="tabpanel"
                aria-labelledby="nav-profile-tab"
                tabindex="0"
            >
                <div
                    class="row"
                    style="margin-top: 1em"
                    v-if="result && result[props.seasonId]"
                >
                    <div class="col">{{ i }}</div>
                </div>
                <ResultsTable
                    :seasonId="props.seasonId"
                    :results="result"
                    v-bind:leagueId="props.leagueId"
                />
            </div>
        </template>
    </div>

    <div class="linkbtn-item linkbtn-fullrow"></div>
</template>
