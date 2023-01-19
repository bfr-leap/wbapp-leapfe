<script setup lang="ts">
import { useRoute } from 'vue-router';
import LeagueIndex from '../components/LeagueIndex.vue';
import CumulativeDeltaChart from '../components/CumulativeDeltaChart.vue';
import GenericTable from './GenericTable.vue';
import TrackBanner from './TrackBanner.vue';
import type {
    SeasonSimsessionIndex,
    SSR_ResultsEntry,
} from '../iracing-endpoints';
import { ref, watchEffect } from 'vue';
import type { Ref } from 'vue';
import {
    getLeagueSimsessionIndex,
    getLeagueSeasonSessions,
    getSimsessionResults,
} from '@/fetch-util';

const route = useRoute();

let props: Ref<{
    leagueId: string;
    seasonId: string;
    subsessionId: string;
    simsessionId: string;
    trackId: string;
    results: {
        [name: string]: string;
    }[];
}> = ref({
    leagueId: '',
    seasonId: '',
    subsessionId: '',
    simsessionId: '',
    trackId: '',
    results: [],
});

async function fectchJsonData() {
    let leagueId: string = '6555';
    let seasonId: string = (route.query.season as string) || '';
    let subsessionId: string = (route.query.subsession as string) || '';
    let simsessionId: string = (route.query.simsession as string) || '';

    if (isNaN(Number.parseInt(seasonId))) {
        seasonId = '';
    }

    if (isNaN(Number.parseInt(subsessionId))) {
        subsessionId = '';
    }

    if (isNaN(Number.parseInt(simsessionId))) {
        simsessionId = '';
    }

    let seasonSimsessionIndex: SeasonSimsessionIndex[] =
        await getLeagueSimsessionIndex(leagueId);

    let selectedSeason = seasonSimsessionIndex.find(
        (s) => s.season_id.toString() === seasonId
    );

    if (!selectedSeason) {
        // find the first seasson with sessions
        // ...and do the same for other props
        let seasonIndex: number = 0;
        for (let i = 0; i < seasonSimsessionIndex.length; ++i) {
            if (seasonSimsessionIndex[i].sessions.length > 0) {
                seasonIndex = i;
                break;
            }
        }

        selectedSeason = seasonSimsessionIndex[seasonIndex];

        seasonId = selectedSeason.season_id.toString();
        subsessionId = '';
    }

    let selectedSubsession = selectedSeason?.sessions.find(
        (s) => s.subsession_id.toString() === subsessionId
    );

    if (!selectedSubsession) {
        selectedSubsession =
            selectedSeason?.sessions[selectedSeason.sessions.length - 1];
        subsessionId = selectedSubsession?.subsession_id?.toString() || '';
        simsessionId = '';
    }

    let selectedSimsession = selectedSubsession?.simsessions.find(
        (s) => s.simsession_id.toString() === simsessionId
    );

    if (!selectedSimsession) {
        selectedSimsession = selectedSubsession?.simsessions[0];
        simsessionId = selectedSimsession?.simsession_id?.toString() || '';
    }

    let leagueSeasonSessions = await getLeagueSeasonSessions(
        leagueId,
        seasonId
    );

    let trackId: string = '-1';

    for (let s of leagueSeasonSessions.sessions) {
        if (s.subsession_id.toString() === subsessionId) {
            trackId = s.track.track_id.toString();
            break;
        }
    }

    props.value.leagueId = leagueId;
    props.value.seasonId = seasonId;
    props.value.simsessionId = simsessionId;
    props.value.subsessionId = subsessionId;
    props.value.trackId = trackId;

    let simsessionResults = await getSimsessionResults(
        subsessionId,
        simsessionId
    );

    props.value.results = <any>simsessionResults.results.map((row) => {
        return {
            pos: row.position,
            cust_id: row.cust_id,
            start: row.start_position,
            fastest_lap: row.fastest_lap_time,
            pace_percent:
                row.pace_percent || row.pace_percent === 0
                    ? row.pace_percent + '%'
                    : '',
            fast_lap: row.fast_lap,
            laps: row.laps_completed,
            pts: row.points,
            inc: row.incidents,
        };
    });
}
watchEffect(fectchJsonData);
</script>

<template>
    <template v-if="props.leagueId && props.seasonId && props.subsessionId">
        <LeagueIndex
            v-bind:simsession-id="props.simsessionId"
            v-bind:subsession-id="props.subsessionId"
            v-bind:season-id="props.seasonId"
            v-bind:league-id="props.leagueId"
        />

        <div class="card bg-dark text-light m-2">
            <div class="card-body p-2">
                <TrackBanner v-bind:track-id="props.trackId" />
                <div style="height: 2em"></div>
                <div class="container">
                    <!-- <nav>
                        <div class="nav nav-tabs" id="nav-tab" role="tablist">
                            <button
                                class="nav-link active"
                                id="nav-home-tab"
                                data-bs-toggle="tab"
                                data-bs-target="#nav-home"
                                type="button"
                                role="tab"
                                aria-controls="nav-home"
                                aria-selected="true"
                            >
                                Cumulative Delta
                            </button>
                            <button
                                class="nav-link"
                                id="nav-profile-tab"
                                data-bs-toggle="tab"
                                data-bs-target="#nav-profile"
                                type="button"
                                role="tab"
                                aria-controls="nav-profile"
                                aria-selected="false"
                            >
                                Session Report
                            </button>
                        </div>
                    </nav>
                    <div class="tab-content" id="nav-tabContent">
                        <div
                            class="tab-pane fade show active"
                            id="nav-home"
                            role="tabpanel"
                            aria-labelledby="nav-home-tab"
                            tabindex="0"
                        >
                            <CumulativeDeltaChart
                                v-bind:subsession="props.subsessionId"
                                v-bind:simsession="props.simsessionId"
                            />
                        </div>
                        <div
                            class="tab-pane fade"
                            id="nav-profile"
                            role="tabpanel"
                            aria-labelledby="nav-profile-tab"
                            tabindex="0"
                        >
                            <GenericTable title="" :rows="props.results" />
                        </div>
                    </div> -->

                    <div class="row">
                        <GenericTable
                            title="Session Report"
                            :rows="props.results"
                        />
                    </div>
                    <div style="height: 2em"></div>
                </div>
            </div>
        </div>
        <div class="page-break"></div>

        <div class="card bg-dark text-light m-2">
            <div class="card-body p-2">
                <div class="container">
                    <div class="row"><div>Comulative Delta</div></div>
                    <div class="row">
                        <CumulativeDeltaChart
                            v-bind:subsession="props.subsessionId"
                            v-bind:simsession="props.simsessionId"
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
