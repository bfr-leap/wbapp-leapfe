<script setup lang="ts">
import { useRoute } from 'vue-router';
import LeagueIndex from '../components/LeagueIndex.vue';
import CumulativeDeltaChart from '../components/CumulativeDeltaChart.vue';
import StartFinishChart from './StartFinishChart.vue';
import PaceChart from './PaceChart.vue';
import BestQualifyLapChart from './BestQualifyLapChart.vue';
import GenericTable from './GenericTable.vue';
import TrackBanner from './TrackBanner.vue';
import type {
    SeasonSimsessionIndex,
    SSR_ResultsEntry,
} from '../iracing-endpoints';
import { ref, watchEffect, watch } from 'vue';
import type { Ref } from 'vue';
import {
    getLeagueSimsessionIndex,
    getLeagueSeasonSessions,
    getSimsessionResults,
    getTelemetrySubsessionIds,
} from '@/fetch-util';

const route = useRoute();

interface View {
    hasTelemetry: boolean;
    leagueId: string;
    seasonId: string;
    subsessionId: string;
    simsessionId: string;
    simsessionType: 'race' | 'sprint' | 'qualify' | 'practice';
    trackId: string;
    results: {
        [name: string]: string;
    }[];
}

let defaultView: View = {
    hasTelemetry: false,
    leagueId: '',
    seasonId: '',
    subsessionId: '',
    simsessionId: '',
    simsessionType: 'practice',
    trackId: '',
    results: [],
};

let props: Ref<View> = ref(JSON.parse(JSON.stringify(defaultView)));

async function fectchJsonData() {
    props.value = JSON.parse(JSON.stringify(defaultView));

    let leagueId: string = (route.query.league as string) || '';
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

    let i = selectedSeason.sessions.length - 1;

    while (
        (!selectedSubsession || selectedSubsession.simsessions.length == 0) &&
        i >= 0
    ) {
        selectedSubsession = selectedSeason?.sessions[i--];
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

    if (!selectedSimsession) {
        return;
    }

    props.value.simsessionType = selectedSimsession.type;

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
        let r: { [name: string]: any } = {
            pos: row.position,
            cust_id: row.cust_id,
            fastest_lap: row.fastest_lap_time,
            pace_percent:
                row.pace_percent || row.pace_percent === 0
                    ? row.pace_percent + '%'
                    : '',
            fast_lap: row.fast_lap,
            laps: row.laps_completed,
            inc: row.incidents,
        };

        if (
            selectedSimsession?.type === 'race' ||
            selectedSimsession?.type === 'sprint'
        ) {
            r['start'] = row.start_position;
            r['pts'] = row.points;
        }

        return r;
    });

    let telemetrySubsessionIds = await getTelemetrySubsessionIds(
        props.value.leagueId
    );

    props.value.hasTelemetry =
        -1 !==
        telemetrySubsessionIds.indexOf(parseInt(props.value.subsessionId, 10));
}
watchEffect(fectchJsonData);
watch(props, fectchJsonData);
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

        <div
            v-if="
                props.simsessionType === 'race' ||
                props.simsessionType === 'sprint'
            "
            class="card bg-dark text-light m-2"
        >
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

        <div
            v-if="
                props.simsessionType === 'race' ||
                props.simsessionType === 'sprint'
            "
            class="card bg-dark text-light m-2"
        >
            <div class="card-body p-2">
                <div class="container">
                    <div class="row">
                        <StartFinishChart
                            v-bind:subsession="props.subsessionId"
                            v-bind:simsession="props.simsessionId"
                        />
                    </div>
                </div>
            </div>
        </div>

        <div
            v-if="props.simsessionType === 'qualify'"
            class="card bg-dark text-light m-2"
        >
            <div class="card-body p-2">
                <div class="container">
                    <div class="row">
                        <PaceChart
                            v-bind:subsession="props.subsessionId"
                            v-bind:simsession="props.simsessionId"
                            v-bind:league="props.leagueId"
                        />
                    </div>
                </div>
            </div>
        </div>

        <div
            v-if="props.simsessionType === 'qualify' && props.hasTelemetry"
            class="card bg-dark text-light m-2"
        >
            <div class="card-body p-2">
                <div class="container">
                    <div class="row">
                        <div>Fastest Lap Comulative Delta</div>
                    </div>
                    <div class="row">
                        <BestQualifyLapChart
                            v-bind:subsession="props.subsessionId"
                            v-bind:simsession="props.simsessionId"
                            v-bind:league="props.leagueId"
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
