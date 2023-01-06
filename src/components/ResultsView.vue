<script setup lang="ts">
import { useRoute } from 'vue-router';
import LeagueIndex from '../components/LeagueIndex.vue';
import CumulativeDeltaChart from '../components/CumulativeDeltaChart.vue';
import type { SeasonSimsessionIndex } from '../iracing-endpoints';
import { ref, watchEffect } from 'vue';
import type { Ref } from 'vue';
import {
    getLeagueSimsessionIndex,
    getLeagueSeasonSessions,
} from '@/fetch-util';

const route = useRoute();

let props: Ref<{
    leagueId: string;
    seasonId: string;
    subsessionId: string;
    simsessionId: string;
    trackId: string;
}> = ref({
    leagueId: '',
    seasonId: '',
    subsessionId: '',
    simsessionId: '',
    trackId: '',
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
        selectedSubsession = selectedSeason?.sessions[0];
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
                <div class="wrap track-bg">
                    <img
                        class="bg"
                        v-bind:src="`./tracks/${props.trackId}.jpg`"
                    />
                </div>
                <div class="container">
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
.track-bg {
    background-size: cover;
    background-position: center;
    width: 100%;
}
.wrap {
    overflow: hidden;
    position: relative;
}
.bg {
    opacity: 0.8;
    _position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 8em;
    object-fit: cover;
}
</style>
