<script setup lang="ts">
import { RouterLink } from 'vue-router';
import ResultsTable from './ResultsTable.vue';
import type { DriverStats, DriverResults } from '../iracing-endpoints';
import BarChart from './BarChart.vue';
import HLBarChart from './HLBarChart.vue';
import { ref, watchEffect } from 'vue';
import type { Ref } from 'vue';
import {
    getQualifyingChartData,
    getStartFinishChartData,
} from '@/models/driver-stats-model';

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

const qualifyingChartData: Ref<{ name: string; value: number }[] | null> =
    ref(null);
const startFinishChartData: Ref<
    { name: string; hi: number; lo: number }[] | null
> = ref(null);

async function fectchJsonData() {
    qualifyingChartData.value = await getQualifyingChartData(
        props.results.quali,
        props.seasonId,
        props.leagueId
    );

    startFinishChartData.value = await getStartFinishChartData(
        props.results.quali,
        props.results?.race,
        props.results?.sprint,
        props.seasonId,
        props.leagueId
    );
}
watchEffect(fectchJsonData);

const statClasses = 'px-2 py-1 m-1 fs-5';
</script>

<template>
    <div class="fs-4">
        <RouterLink
            class="link-light"
            v-if="seasonId"
            :to="`/?m=standings&league=${props.leagueId}&season=${props.seasonId}`"
            >{{ seasonName }}</RouterLink
        >
        <span v-else>{{ seasonName }}</span>
    </div>
    <div class="d-flex flex-wrap">
        <div :class="statClasses">
            <span class="name">Starts: </span
            ><span class="value"> {{ stats.started }}</span>
        </div>
        <div :class="statClasses">
            <span class="name">Poles: </span
            ><span class="value"> {{ stats.poles }}</span>
        </div>
        <div :class="statClasses">
            <span class="name">Wins: </span
            ><span class="value"> {{ stats.wins }}</span>
        </div>
        <div :class="statClasses">
            <span class="name">Podiums: </span
            ><span class="value"> {{ stats.podiums }}</span>
        </div>
        <div :class="statClasses">
            <span class="name">Top 10: </span
            ><span class="value"> {{ stats.top_10 }}</span>
        </div>
        <div :class="statClasses">
            <span class="name">Top 20: </span
            ><span class="value"> {{ stats.top_20 }}</span>
        </div>
        <div :class="statClasses">
            <span class="name">LEAP Points: </span
            ><span class="value"> {{ stats.power_points }}</span>
        </div>
    </div>

    <ul class="nav nav-pills">
        <!-- <li v-if="barChartData" class="nav-item">
            <a
                class="nav-link active"
                data-bs-toggle="tab"
                v-bind:data-bs-target="`#nav-qpchart-${seasonId}`"
                aria-current="page"
                href="#"
                >Qualifying Performance</a
            >
        </li> -->
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
                        v-bind:data-bs-target="`#nav-qpchart-${seasonId}`"
                        href="#"
                    >
                        Qualifying Performance
                    </a>
                </li>
                <li>
                    <a
                        class="dropdown-item"
                        data-bs-toggle="tab"
                        v-bind:data-bs-target="`#nav-sechart-${seasonId}`"
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
                <template v-for="(result, i) in results">
                    <li v-if="result && result[seasonId]">
                        <a
                            class="dropdown-item"
                            data-bs-toggle="tab"
                            v-bind:data-bs-target="`#nav-${i}-${seasonId}`"
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
            v-bind:id="`nav-qpchart-${seasonId}`"
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
                        v-if="qualifyingChartData"
                        :data="qualifyingChartData"
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
                        v-if="startFinishChartData"
                        v-bind:data="startFinishChartData"
                    />
                </div>
            </div>
        </div>
        <template v-for="(result, i) in results">
            <div
                class="tab-pane fade"
                v-bind:id="`nav-${i}-${seasonId}`"
                role="tabpanel"
                aria-labelledby="nav-profile-tab"
                tabindex="0"
            >
                <div
                    class="row"
                    style="margin-top: 1em"
                    v-if="result && result[seasonId]"
                >
                    <div class="col">{{ i }}</div>
                </div>
                <ResultsTable
                    :seasonId="seasonId"
                    :results="result"
                    v-bind:leagueId="props.leagueId"
                />
            </div>
        </template>
    </div>

    <div class="linkbtn-item linkbtn-fullrow"></div>
</template>
