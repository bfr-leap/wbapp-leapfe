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
import { fetchObjects } from '@/fetch-util';

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
    const [driverStatsMap, leagueTeamsInfo, singleMemberData, leagueSeasons] = <
        [
            { [name: number]: DriverStatsMap },
            CuratedLeagueTeamsInfo,
            M_Member,
            LeagueSeasons
        ]
    >await fetchObjects([
        `./data/derived/leagueDriverStats_${props.league}.json`,
        `./data/curated/leagueTeamsInfo_${props.league}.json`,
        `./data/derived/singleMemberData_${props.driver}.json`,
        `./data/scraped/leagueSeasons_${props.league}.json`,
    ]);

    const [driverSessionResultsRace] = <[DriverResults]>(
        await fetchObjects([
            `./data/derived/driverSessionResults_race_${props.driver}.json`,
        ])
    );

    const [driverSessionResultsSprint] = <[DriverResults]>(
        await fetchObjects([
            `./data/derived/driverSessionResults_sprint_${props.driver}.json`,
        ])
    );

    const [driverSessionResultsQuali] = <[DriverResults]>(
        await fetchObjects([
            `./data/derived/driverSessionResults_quali_${props.driver}.json`,
        ])
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
    <div>
        <div class="card bg-dark text-light m-2 sticky-top">
            <div class="card-body p-2">
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
        <div class="card bg-dark text-light m-2">
            <div class="card-body p-2">
                <template v-for="season in _leagueSeasons?.seasons">
                    <template
                        v-if="_driverStatsMap?.[season.season_id]?.[driverId]"
                    >
                        <Stats
                            :stats="
                                _driverStatsMap?.[season.season_id]?.[driverId]
                            "
                            :results="_driverResults"
                            :bar-chart-results="_driverResults[2]"
                            :seasonName="season.season_name"
                            :seasonId="season.season_id"
                            v-bind:league-id="props.league"
                        />
                    </template>
                </template>
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
    </div>
</template>
