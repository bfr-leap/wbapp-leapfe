<script setup lang="ts">
import Stats from './Stats.vue';
import DriverTag from './DriverTag.vue';
import { getMemberViewFromM_Memeber } from './driverUtils';
import { ref, watchEffect, computed, provide } from 'vue';
import type { Ref } from 'vue';
import type {
    CuratedLeagueTeamsInfo,
    DriverStatsMap,
    DriverStats,
    M_Member,
    LeagueSeasons,
    DriverResults,
    SSR_ResultsEntry,
} from '../iracing-endpoints';
import {
    getCuratedLeagueTeamsInfo,
    getDriverResults,
    getLeagueDriverStats,
    getLeagueSeasons,
    getSingleMemberData,
} from '@/fetch-util';

const props = defineProps<{
    league: string;
    driver: string;
}>();

provide('league', props.league);

const _singleMemberData: Ref<M_Member | null> = ref(null);
const _leagueSeasons: Ref<LeagueSeasons | null> = ref(null);
const _teamsInfo: Ref<CuratedLeagueTeamsInfo | null> = ref(null);
const _driverStatsMap: Ref<{ [name: number]: DriverStatsMap } | null> =
    ref(null);
const _driverResults: Ref<DriverResults[]> = ref([]);

const _allTimeResults: Ref<DriverResults[]> = ref([]);

watchEffect(async () => {
    const driverStatsMap = await getLeagueDriverStats(props.league);
    const leagueTeamsInfo = await getCuratedLeagueTeamsInfo(props.league);
    const singleMemberData = await getSingleMemberData(props.driver);

    const leagueSeasons = await getLeagueSeasons(props.league);

    const driverSessionResultsRace = await getDriverResults(
        props.driver,
        'race'
    );

    const driverSessionResultsSprint = await getDriverResults(
        props.driver,
        'sprint'
    );

    const driverSessionResultsQuali = await getDriverResults(
        props.driver,
        'quali'
    );

    _driverResults.value = [
        driverSessionResultsRace,
        driverSessionResultsSprint,
        driverSessionResultsQuali,
    ];

    _driverStatsMap.value = driverStatsMap;
    _teamsInfo.value = leagueTeamsInfo;
    _singleMemberData.value = singleMemberData;
    _leagueSeasons.value = leagueSeasons;

    _allTimeResults.value = [];
    _allTimeResults.value.push(
        calculateAllTimeResults(driverSessionResultsRace)
    );
    _allTimeResults.value.push(
        calculateAllTimeResults(driverSessionResultsSprint)
    );
    _allTimeResults.value.push(
        calculateAllTimeResults(driverSessionResultsQuali)
    );
});

function calculateAllTimeResults(
    inDriverResults: DriverResults
): DriverResults {
    let ret: DriverResults = {};
    if (!inDriverResults) {
        return ret;
    }
    let allTime: { [name: number]: SSR_ResultsEntry } = {};

    let inSeasonKeys = Object.keys(inDriverResults);

    for (let seasonKey of inSeasonKeys) {
        let season = inDriverResults[Number.parseInt(seasonKey)];
        let eventKeys = Object.keys(season);
        for (let eventKey of eventKeys) {
            let eventKeyNum = Number.parseInt(eventKey);
            allTime[eventKeyNum] = season[eventKeyNum];
        }
    }

    ret[0] = allTime;

    return ret;
}

const driverId = computed(() => Number.parseInt(props.driver));
const memberView = computed(() => {
    return getMemberViewFromM_Memeber(_singleMemberData.value, {}, {});
});
</script>

<template>
    <div class="card bg-dark text-light m-2 sticky-top">
        <div class="card-body p-2">
            <div class="row p-3">
                <div
                    v-bind:class="`col-1 driver-img club-${memberView.clubId}`"
                ></div>
                <div class="col">
                    <DriverTag
                        class="fs-4"
                        v-bind:lastName="memberView.lastName"
                        v-bind:firstName="memberView.firstName"
                        v-bind:licenseLevel="memberView.licenseLevel"
                        v-bind:iRating="memberView.iRating"
                        v-bind:safetyRating="memberView.safetyRating"
                        v-bind:teamName="memberView.teamName"
                        v-bind:clubId="memberView.clubId"
                    />
                </div>
            </div>
        </div>
    </div>
    <template v-for="season in _leagueSeasons?.seasons">
        <template v-if="_driverStatsMap?.[season.season_id]?.[driverId]">
            <div class="card bg-dark text-light m-2">
                <div class="card-body p-2">
                    <Stats
                        :stats="_driverStatsMap?.[season.season_id]?.[driverId]"
                        :results="_driverResults"
                        :bar-chart-results="_driverResults[2]"
                        :seasonName="season.season_name"
                        :seasonId="season.season_id"
                        v-bind:league-id="props.league"
                    />
                </div>
            </div>
        </template>
    </template>
    <div class="card bg-dark text-light m-2">
        <div class="card-body p-2">
            <Stats
                v-if="_driverStatsMap?.[0]?.[driverId]"
                :stats="_driverStatsMap[0][driverId]"
                :results="[]"
                :bar-chart-results="_allTimeResults[2]"
                seasonName="All Time"
                :seasonId="0"
                v-bind:league-id="props.league"
            />
        </div>
    </div>
</template>

<style scoped>
.driver-img {
    height: 3em;
    width: 3em;
    background-color: aqua;
    border-radius: 1.5em;
    background-size: cover;
    background-position: center;
}

.club-30,
.club-14,
.club-6,
.club-27,
.club-23,
.club-28,
.club-23,
.club-17,
.club-33,
.club-26,
.club-22,
.club-29,
.club-16,
.club-32 {
    background-image: url(/flags/usa.png);
}

.club-36 {
    background-image: url(/flags/ukandi.jpg);
}

.club-44 {
    background-image: url(/flags/finland.png);
}

.club-1 {
    background-image: url(/flags/international.png);
}

.club-43 {
    background-image: url(/flags/scandinavia.png);
}

.club-40 {
    background-image: url(/flags/benelux.png);
}

.club-46 {
    background-image: url(/flags/europe.png);
}

.club-45 {
    background-image: url(/flags/brazil.png);
}

.club-41 {
    background-image: url(/flags/italy.png);
}

.club-38 {
    background-image: url(/flags/iberia.png);
}

.club-34 {
    background-image: url(/flags/australia.png);
}
</style>
