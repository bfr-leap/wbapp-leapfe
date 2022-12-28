<script setup lang="ts">
import { computed, inject, type Ref } from 'vue';
import type { DriverResults, SSR_ResultsEntry } from '../iracing-endpoints';
import { getSubsessionName } from '../session-utils';

import { ref, watchEffect } from 'vue';

const props = defineProps<{
    results: DriverResults;
    seasonId: number;
    leagueId: string;
}>();

const league = inject<string>('league');

const seasonRaceResults = computed(() => {
    return props.results[props.seasonId];
});

const _subsessionNames: { [name: string]: string } = {};
const resultsInOrder: Ref<
    { sessionId: number; sessionName: string; resultEntry: SSR_ResultsEntry }[]
> = ref([]);

const avgTotal = computed(() => {
    let totalPts = 0;
    let pacePctTotal = 0;
    let pacePctCount = 0;
    let posTotal = 0;
    let posCount = 0;
    let startPosTotal = 0;
    let startPosCount = 0;
    let incidentTotal = 0;
    let lapsTotal = 0;

    if (!seasonRaceResults.value) {
        return {
            pos: 0,
            totalPts,
            startPos: 0,
            pacePct: '',
            incidentTotal,
            lapsTotal,
        };
    }

    Object.values(seasonRaceResults.value).forEach((r) => {
        totalPts += r.points;
        if (!isNaN(r.pace_percent)) {
            pacePctCount += 1;
            pacePctTotal += r.pace_percent;
        }

        posTotal += r.position;
        posCount += 1;
        startPosTotal += r.start_position;
        startPosCount += 1;
        incidentTotal += r.incidents;
        lapsTotal += r.laps_completed;
    });
    return {
        pos: Math.round((100 * posTotal) / posCount) / 100,
        totalPts,
        startPos: Math.round((100 * startPosTotal) / startPosCount) / 100,
        pacePct: pacePctCount
            ? `${Math.round((100 * pacePctTotal) / pacePctCount) / 100}%`
            : '',
        incidentTotal,
        lapsTotal,
    };
});

async function fectchJsonData() {
    if (!seasonRaceResults.value) {
        resultsInOrder.value = [];
        return;
    }
    const sessionIdsInOrder = Object.keys(seasonRaceResults.value).map(
        (stringId) => Number.parseInt(stringId)
    );
    sessionIdsInOrder.sort();
    for (let it of sessionIdsInOrder) {
        _subsessionNames[it] = await getSubsessionName(
            props.leagueId,
            it.toString()
        );
    }

    resultsInOrder.value = sessionIdsInOrder.map((sessionId) => ({
        sessionId,
        sessionName: _subsessionNames[sessionId] || sessionId.toString(),
        resultEntry: seasonRaceResults.value[sessionId],
    }));
}
watchEffect(fectchJsonData);
</script>

<template>
    <table
        v-if="resultsInOrder.length > 0"
        class="table table-dark table-hover"
    >
        <thead>
            <tr>
                <th>session</th>
                <th>position</th>
                <th>points</th>
                <th>start position</th>
                <th>fast lap</th>
                <th>fastest lap time</th>
                <th>pace percent</th>
                <th>incidents</th>
                <th>laps completed</th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="result in resultsInOrder">
                <td>
                    <RouterLink
                        class="link-light"
                        :to="`/results?league=${league}&season=${props.seasonId}&simsession=0&subsession=${result.sessionId}`"
                        >{{ result.sessionName }}</RouterLink
                    >
                </td>
                <td>{{ result.resultEntry.position }}</td>
                <td>{{ result.resultEntry.points }}</td>
                <td>{{ result.resultEntry.start_position }}</td>
                <td>{{ result.resultEntry.fast_lap }}</td>
                <td>
                    {{
                        Math.round(result.resultEntry.fastest_lap_time / 100) /
                        100
                    }}s
                </td>
                <td>
                    {{
                        null === result.resultEntry.pace_percent
                            ? '--'
                            : `${result.resultEntry.pace_percent}%`
                    }}
                </td>
                <td>{{ result.resultEntry.incidents }}</td>
                <td>{{ result.resultEntry.laps_completed }}</td>
            </tr>
            <tr>
                <td>average/total</td>
                <td>{{ avgTotal.pos }}</td>
                <td>{{ avgTotal.totalPts }}</td>
                <td>{{ avgTotal.startPos }}</td>
                <td>--</td>
                <td>--</td>
                <td>{{ avgTotal.pacePct }}</td>
                <td>{{ avgTotal.incidentTotal }}</td>
                <td>{{ avgTotal.lapsTotal }}</td>
            </tr>
        </tbody>
    </table>
</template>
