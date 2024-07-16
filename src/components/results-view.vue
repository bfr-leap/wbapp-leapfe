<script setup lang="ts">
import { ref, watchEffect, watch } from 'vue';
import type { Ref } from 'vue';
import { useRoute } from 'vue-router';
import LeagueIndex from '@/components/league-index.vue';
import CumulativeDeltaChart from '@/components/cumulative-delta-chart.vue';
import StartFinishChart from './start-finish-chart.vue';
import PaceChart from './pace-chart.vue';
import BestQualifyLapChart from '@/components/best-qualify-lap-chart.vue';
import GenericTable from './generic-table.vue';
import TrackBanner from './track-banner.vue';
import type { ResultsModel } from '@/models/results-model';
import {
    getDefaultResultsModel,
    getResultsModel,
} from '@/models/results-model';

const route = useRoute();

let resultsModel: Ref<ResultsModel> = ref(getDefaultResultsModel());

let routeObserver: Ref<{
    leagueId: string;
    seasonId: string;
    subsessionId: string;
    simsessionId: string;
}> = ref({
    leagueId: '',
    seasonId: '',
    subsessionId: '',
    simsessionId: '',
});

async function fetchModelData() {
    let leagueId: string = (route.query.league as string) || '';
    let seasonId: string = (route.query.season as string) || '';
    let subsessionId: string = (route.query.subsession as string) || '';
    let simsessionId: string = (route.query.simsession as string) || '';

    if (
        routeObserver.value.leagueId !== leagueId ||
        routeObserver.value.seasonId !== seasonId ||
        routeObserver.value.subsessionId !== subsessionId ||
        routeObserver.value.simsessionId !== simsessionId
    ) {
        routeObserver.value.leagueId = leagueId;
        routeObserver.value.seasonId = seasonId;
        routeObserver.value.subsessionId = subsessionId;
        routeObserver.value.simsessionId = simsessionId;
    }

    resultsModel.value = await getResultsModel(
        leagueId,
        seasonId,
        subsessionId,
        simsessionId
    );
}
watchEffect(fetchModelData);
watch(routeObserver, fetchModelData);
</script>

<template>
    <template
        v-if="
            resultsModel.leagueId &&
            resultsModel.seasonId &&
            resultsModel.subsessionId
        "
    >
        <LeagueIndex
            v-bind:simsession-id="resultsModel.simsessionId"
            v-bind:subsession-id="resultsModel.subsessionId"
            v-bind:season-id="resultsModel.seasonId"
            v-bind:league-id="resultsModel.leagueId"
        />

        <div class="card bg-dark text-light m-2">
            <div class="card-body p-2">
                <TrackBanner v-bind:track-id="resultsModel.trackId" />
            </div>
        </div>

        <div
            v-if="resultsModel.summary.length > 0"
            class="card bg-dark text-light m-2"
        >
            <div class="card-body p-2">
                <p v-for="p of resultsModel.summary">
                    {{ p }}
                </p>
            </div>
        </div>
        <div class="card bg-dark text-light m-2">
            <div class="card-body p-2">
                <div style="height: 2em"></div>
                <div class="container">
                    <div class="row">
                        <GenericTable
                            title="Session Report"
                            :leagueId="resultsModel.leagueId"
                            :rows="resultsModel.results"
                            :season-id="resultsModel.seasonId"
                        />
                    </div>
                    <div style="height: 2em"></div>
                </div>
            </div>
        </div>
        <div class="page-break"></div>

        <div
            v-if="
                resultsModel.simsessionType === 'race' ||
                resultsModel.simsessionType === 'sprint'
            "
            class="card bg-dark text-light m-2"
        >
            <div class="card-body p-2">
                <div class="container">
                    <div class="row">
                        <div>Comulative Delta</div>
                    </div>
                    <div class="row">
                        <CumulativeDeltaChart
                            v-bind:league="resultsModel.leagueId"
                            v-bind:subsession="resultsModel.subsessionId"
                            v-bind:simsession="resultsModel.simsessionId"
                        />
                    </div>
                </div>
            </div>
        </div>

        <div
            v-if="
                resultsModel.simsessionType === 'race' ||
                resultsModel.simsessionType === 'sprint'
            "
            class="card bg-dark text-light m-2"
        >
            <div class="card-body p-2">
                <div class="container">
                    <div class="row">
                        <StartFinishChart
                            v-bind:league="resultsModel.leagueId"
                            v-bind:subsession="resultsModel.subsessionId"
                            v-bind:simsession="resultsModel.simsessionId"
                        />
                    </div>
                </div>
            </div>
        </div>

        <div
            v-if="resultsModel.simsessionType === 'qualify'"
            class="card bg-dark text-light m-2"
        >
            <div class="card-body p-2">
                <div class="container">
                    <div class="row">
                        <PaceChart
                            v-bind:subsession="resultsModel.subsessionId"
                            v-bind:simsession="resultsModel.simsessionId"
                            v-bind:league="resultsModel.leagueId"
                        />
                    </div>
                </div>
            </div>
        </div>

        <div
            v-if="
                resultsModel.simsessionType === 'qualify' &&
                resultsModel.hasTelemetry
            "
            class="card bg-dark text-light m-2"
        >
            <div class="card-body p-2">
                <div class="container">
                    <div class="row">
                        <div>Fastest Lap Comulative Delta</div>
                    </div>
                    <div class="row">
                        <BestQualifyLapChart
                            v-bind:subsession="resultsModel.subsessionId"
                            v-bind:simsession="resultsModel.simsessionId"
                            v-bind:league="resultsModel.leagueId"
                        />
                    </div>
                </div>
            </div>
        </div>
    </template>
    <div v-else class="card bg-dark text-light m-2">
        <div class="card-body p-2">
            <div class="container">
                <div class="row">Results not Available</div>
            </div>
        </div>
    </div>
</template>
<style scoped>
@media print {
    /* .row{
        display: block;
    } */
    .page-break {
        page-break-before: always;
    }
}
</style>
