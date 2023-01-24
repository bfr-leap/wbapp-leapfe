<script setup lang="ts">
import { RouterLink } from 'vue-router';
import ResultsTable from './ResultsTable.vue';
import type { DriverStats, DriverResults } from '../iracing-endpoints';
import BarChart from './BarChart.vue';
import HLBarChart from './HLBarChart.vue';
import { ref, watchEffect } from 'vue';
import type { Ref } from 'vue';
import { getShortSubsessionName } from '../session-utils';

const props = withDefaults(
    defineProps<{
        stats: DriverStats;
        results: DriverResults[];
        seasonName: string;
        leagueId: string;
        seasonId?: number;
    }>(),
    {
        seasonId: 0,
    }
);

const barChartData: Ref<{ name: string; value: number }[] | null> = ref(null);
const startFinishChart: Ref<{ name: string; hi: number; lo: number }[] | null> =
    ref(null);

async function fectchJsonData() {
    if (!props.results[2]) {
        barChartData.value = null;
        return;
    }
    const seasonRaceResults = props.results[2][props.seasonId];

    const names: { [name: string]: string } = {};

    let sessionKeys = Object.keys(seasonRaceResults)
        .map((v) => Number.parseInt(v, 10))
        .sort((a, b) => a - b);

    let usedNames: { [name: string]: boolean } = {};

    for (let subsessionIt of sessionKeys) {
        let shortName = await getShortSubsessionName(
            props.leagueId,
            subsessionIt.toString()
        );

        while (usedNames[shortName]) {
            shortName += ' ';
        }

        usedNames[shortName] = true;
        names[subsessionIt] = shortName;
    }

    const data = sessionKeys.map((k) => {
        const entry = seasonRaceResults[k];
        return {
            name: names[k.toString()] || k.toString(),
            value: entry.pace_percent,
        };
    });

    const filteredData = data.filter((d) => d.value !== null);
    barChartData.value = filteredData;

    startFinishChart.value = <{ name: string; hi: number; lo: number }[]>(
        sessionKeys.flatMap((k) => {
            const sprint = props.results?.[1]?.[props.seasonId]?.[k] || null;
            const race = props.results?.[0]?.[props.seasonId]?.[k] || null;
            return [
                sprint
                    ? {
                          name:
                              (names[k.toString()] || k.toString()) + ':Sprint',
                          lo:
                              -1 *
                              (sprint.start_position === 0
                                  ? sprint.position
                                  : sprint.start_position),
                          hi: -1 * sprint.position,
                      }
                    : null,
                race
                    ? {
                          name: (names[k.toString()] || k.toString()) + ':Race',
                          lo:
                              -1 *
                              (race.start_position === 0
                                  ? race.position
                                  : race.start_position),
                          hi: -1 * race.position,
                      }
                    : null,
            ].filter((a) => a !== null);
        })
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
            :to="`/?m=standings&league=6555&season=${seasonId}`"
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
        <li v-if="results.length > 0" class="nav-item dropdown">
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
        <li v-if="results.length > 0" class="nav-item dropdown">
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
                            v-bind:data-bs-target="`#nav-${
                                ['race', 'sprint', 'qualy'][i]
                            }-${seasonId}`"
                            href="#"
                        >
                            {{ ['Race', 'Sprint', 'Qualy'][i] }}
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
                    <BarChart v-if="barChartData" :data="barChartData" />
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
                        v-if="startFinishChart"
                        v-bind:data="startFinishChart"
                    />
                </div>
            </div>
        </div>
        <template v-for="(result, i) in results">
            <div
                class="tab-pane fade"
                v-bind:id="`nav-${['race', 'sprint', 'qualy'][i]}-${seasonId}`"
                role="tabpanel"
                aria-labelledby="nav-profile-tab"
                tabindex="0"
            >
                <div
                    class="row"
                    style="margin-top: 1em"
                    v-if="result && result[seasonId]"
                >
                    <div class="col">{{ ['Race', 'Sprint', 'Qualy'][i] }}</div>
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
