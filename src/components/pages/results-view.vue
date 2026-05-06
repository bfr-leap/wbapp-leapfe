<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import type { Ref } from 'vue';
import CumulativeDeltaChart from '@@/src/components/vis/cumulative-delta-chart.vue';
import StartFinishChart from '../vis/start-finish-chart.vue';
import PaceChart from '../vis/pace-chart.vue';
import BestQualifyLapChart from '@@/src/components/vis/best-qualify-lap-chart.vue';
import GenericTable from '../vis/generic-table.vue';
import TrackBanner from '../track/track-banner.vue';
import type { ResultsModel } from '@@/src/models/pages/results-model';
import {
    getDefaultResultsModel,
    getResultsModel,
} from '@@/src/models/pages/results-model';

const props = defineProps<{
    league: string;
    season: string;
    subsession: string;
    simsession: string;
}>();

async function fetchModelData() {
    return await getResultsModel(
        props.league,
        props.season,
        props.subsession,
        props.simsession
    );
}

const resultsModel: Ref<ResultsModel> =
    await asyncDataWithReactiveModel<ResultsModel>(
        `ResultsModel-${[
            props.league,
            props.season,
            props.subsession,
            props.simsession,
        ].join('-')}`,
        fetchModelData,
        getDefaultResultsModel,
        [
            () => props.league,
            () => props.season,
            () => props.subsession,
            () => props.simsession,
        ]
    );
</script>

<template>
    <div class="page">
        <template
            v-if="
                resultsModel.leagueId &&
                resultsModel.seasonId &&
                resultsModel.subsessionId
            "
        >
            <section class="section">
                <TrackBanner v-bind:track-id="resultsModel.trackId" />
            </section>

            <section v-if="resultsModel.summary.length > 0" class="section">
                <div v-html="resultsModel.summary[0]"></div>
            </section>

            <section class="section">
                <header class="section__head">
                    <span class="section__title">Session Report</span>
                </header>
                <GenericTable
                    title=""
                    :leagueId="resultsModel.leagueId"
                    :rows="resultsModel.results"
                    :season-id="resultsModel.seasonId"
                />
            </section>

            <section
                v-if="
                    resultsModel.simsessionType === 'race' ||
                    resultsModel.simsessionType === 'sprint'
                "
                class="section"
            >
                <header class="section__head">
                    <span class="section__title">Cumulative Delta</span>
                </header>
                <CumulativeDeltaChart
                    v-bind:league="resultsModel.leagueId"
                    v-bind:subsession="resultsModel.subsessionId"
                    v-bind:simsession="resultsModel.simsessionId"
                />
            </section>

            <section
                v-if="
                    resultsModel.simsessionType === 'race' ||
                    resultsModel.simsessionType === 'sprint'
                "
                class="section"
            >
                <header class="section__head">
                    <span class="section__title">Start vs Finish</span>
                </header>
                <StartFinishChart
                    v-bind:league="resultsModel.leagueId"
                    v-bind:subsession="resultsModel.subsessionId"
                    v-bind:simsession="resultsModel.simsessionId"
                />
            </section>

            <section
                v-if="resultsModel.simsessionType === 'qualify'"
                class="section"
            >
                <header class="section__head">
                    <span class="section__title">Pace</span>
                </header>
                <PaceChart
                    v-bind:subsession="resultsModel.subsessionId"
                    v-bind:simsession="resultsModel.simsessionId"
                    v-bind:league="resultsModel.leagueId"
                />
            </section>

            <section
                v-if="
                    resultsModel.simsessionType === 'qualify' &&
                    resultsModel.hasTelemetry
                "
                class="section"
            >
                <header class="section__head">
                    <span class="section__title">
                        Fastest Lap Cumulative Delta
                    </span>
                </header>
                <BestQualifyLapChart
                    v-bind:subsession="resultsModel.subsessionId"
                    v-bind:simsession="resultsModel.simsessionId"
                    v-bind:league="resultsModel.leagueId"
                />
            </section>
        </template>
        <section v-else class="section">
            <div class="results-empty">Results not available</div>
        </section>
    </div>
</template>
<style scoped>
.results-empty {
    color: var(--text-muted);
    text-align: center;
    padding: var(--space-6) 0;
    font-size: var(--text-sm);
}
</style>
