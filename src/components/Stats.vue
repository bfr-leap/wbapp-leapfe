<script setup lang="ts">
import { RouterLink } from 'vue-router';
import ResultsTable from './ResultsTable.vue';
import type { DriverStats, DriverResults } from '../iracing-endpoints';
import BarChart from './BarChart.vue';
import { computed, ref, watchEffect } from 'vue';
import type { Ref } from 'vue';
import { stringifyExpression } from '@vue/compiler-core';
import { getSubsessionName } from '../session-utils';

const props = withDefaults(
    defineProps<{
        stats: DriverStats;
        results: DriverResults[];
        barChartResults?: DriverResults;
        seasonName: string;
        leagueId: string;
        seasonId?: number;
    }>(),
    {
        seasonId: 0,
    }
);

const barChartData: Ref<{ name: string; value: number }[] | null> = ref(null);

async function fectchJsonData() {
    if (!props.barChartResults) {
        barChartData.value = null;
        return;
    }
    console.log('here');
    const seasonRaceResults = props.barChartResults[props.seasonId];

    const names: { [name: string]: string } = {};

    let sessionKeys = Object.keys(seasonRaceResults)
        .map((v) => Number.parseInt(v, 10))
        .sort((a, b) => a - b);

    let usedNames: { [name: string]: boolean } = {};

    for (let subsessionIt of sessionKeys) {
        let shortName =
            (
                await getSubsessionName(props.leagueId, subsessionIt.toString())
            ).substring(0, 8) + '...';

        while (usedNames[shortName]) {
            shortName += '.';
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
            <span class="name">Power Points: </span
            ><span class="value"> {{ stats.power_points }}</span>
        </div>
    </div>
    <div class="row">
        <div class="col-4 m-auto">
            <BarChart v-if="barChartData" :data="barChartData" />
        </div>
    </div>
    <div class="small-chart"></div>

    <template v-for="(result, i) in results">
        <div
            class="row"
            style="margin-top: 3em"
            v-if="result && result[seasonId]"
        >
            <div class="col">{{ ['Race', 'Sprint', 'Qualy'][i] }}</div>
        </div>
        <ResultsTable
            :seasonId="seasonId"
            :results="result"
            v-bind:leagueId="props.leagueId"
        />
    </template>

    <div class="linkbtn-item linkbtn-fullrow"></div>
</template>
