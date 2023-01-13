<script setup lang="ts">
import { getMemberViewFromM_Memeber, getRoadLicense } from './driverUtils';
import { RouterLink } from 'vue-router';
import { ref, watchEffect } from 'vue';
import type { Ref } from 'vue';
import type {
    MembersData,
    M_License,
    SeasonSimsessionIndex,
    CuratedLeagueTeamsInfo,
    CLTI_Team,
    DriverStatsMap,
} from '../iracing-endpoints';
import { fetchObjects } from '@/fetch-util';
import type { DefineStoreOptionsInPlugin } from 'pinia';
import DriverTag from './DriverTag.vue';
import LeagueSeasonMenu from './LeagueSeasonMenu.vue';

const props = withDefaults(
    defineProps<{
        league: string;
        season: string;
        summary_mode: boolean;
    }>(),
    { summary_mode: false }
);

interface LocalView {
    drivers: {
        position: number;
        points: number;
        clubId: number;
        lastName: string;
        firstName: string;
        iRating: string;
        licenseLevel: string;
        safetyRating: string;
        teamName: string;
        showStats: boolean;
        custId: string;
        stats: {
            started: number;
            poles: number;
            wins: number;
            podiums: number;
            top10: number;
            top20: number;
        };
    }[];
}

let view: Ref<LocalView> = ref({
    drivers: [],
});

function populateTeamInfoMaps(
    leagueTeamsInfo: CuratedLeagueTeamsInfo,
    seasonId: number,
    userTeamIdMap: { [name: number]: number },
    teamInfoMap: { [name: number]: CLTI_Team }
) {
    let season = leagueTeamsInfo?.seasons.find((s) => s.season_id === seasonId);
    if (!season) {
        return {};
    }

    for (let team of season.teams) {
        teamInfoMap[team.team_id] = team;
        for (let member of team.team_members) {
            userTeamIdMap[member] = team.team_id;
        }
    }
}

async function fectchJsonData() {
    let [
        _driverStatsMap,
        _curatedLeagueTeamsInfo,
        _membersData,
        _seasonSimsessionIndex,
    ] = <
        [
            { [name: number]: DriverStatsMap },
            CuratedLeagueTeamsInfo,
            MembersData,
            SeasonSimsessionIndex[]
        ]
    >await fetchObjects([
        `./data/derived/leagueDriverStats_${props.league}.json`,
        `./data/curated/leagueTeamsInfo_${props.league}.json`,
        `./data/scraped/membersData_${props.league}_${props.season}.json`,
        `./data/derived/leagueSimsessionIndex_${props.league}.json`,
    ]);

    let _seasonId = Number.parseInt(props.season);

    let _userTeamIdMap: { [name: number]: number } = {};
    let _teamInfoMap: { [name: number]: CLTI_Team } = {};
    populateTeamInfoMaps(
        _curatedLeagueTeamsInfo,
        _seasonId,
        _userTeamIdMap,
        _teamInfoMap
    );

    let sortedM =
        _membersData?.members.sort((a, b) =>
            _driverStatsMap[_seasonId][b.cust_id].power_points !==
            _driverStatsMap[_seasonId][a.cust_id].power_points
                ? _driverStatsMap[_seasonId][b.cust_id].power_points -
                  _driverStatsMap[_seasonId][a.cust_id].power_points
                : (getRoadLicense(b.licenses).irating | 0) -
                  (getRoadLicense(a.licenses).irating | 0)
        ) || [];

    view.value.drivers = [];

    let position = 1;

    for (let member of sortedM) {
        const memberView = getMemberViewFromM_Memeber(
            member,
            _userTeamIdMap,
            _teamInfoMap
        );

        view.value.drivers.push({
            position: position,
            points: _driverStatsMap[_seasonId][member.cust_id].power_points,
            ...memberView,
            showStats: false,
            custId: member.cust_id.toString(),
            stats: {
                started: -1,
                poles: -1,
                wins: -1,
                podiums: -1,
                top10: -1,
                top20: -1,
            },
        });

        ++position;

        if (props.summary_mode && position > 3) {
            break;
        }
    }
}
watchEffect(fectchJsonData);
</script>

<template>
    <LeagueSeasonMenu
        v-if="!summary_mode"
        targetPage="standings"
        v-bind:league="props.league"
        v-bind:season="props.season"
    ></LeagueSeasonMenu>

    <div class="card bg-dark text-light m-2">
        <div class="card-body p-2">
            <div class="container">
                <div v-if="view.drivers.length !== 0" class="row">
                    <div class="col-2 d-flex d-sm-none text-center flex-column">
                        <div class="mx-1 inline-block"><span>LEAP</span></div>
                        <div class="inline-block"><span>R-P</span></div>
                    </div>
                    <div
                        class="col-2 d-none d-sm-flex text-center justify-content-center"
                    >
                        <div>LEAP Ranking</div>
                    </div>
                    <div
                        class="col-2 d-none d-sm-flex text-center justify-content-center"
                    >
                        <div>LEAP Points</div>
                    </div>
                    <div class="col-2 col-lg-1 text-center"></div>
                    <div class="col-6 col-lg-7 text-left">Driver</div>
                </div>

                <template
                    v-if="view.drivers.length !== 0"
                    v-for="(member, i) in view.drivers"
                >
                    <div class="row">
                        <div
                            class="col-2 justify-content-center d-flex d-sm-none text-center flex-column"
                        >
                            <div class="fs-2 mx-1">
                                {{ member.position }}
                            </div>
                            <div class="d-flex fs-7 justify-content-center">
                                <span>{{ member.points }}</span>
                            </div>
                        </div>
                        <div
                            class="col-2 d-none d-sm-flex justify-content-center fs-2"
                        >
                            <div>{{ member.position }}</div>
                        </div>
                        <div
                            class="col-2 d-none d-sm-flex justify-content-center fs-4"
                        >
                            <div>{{ member.points }}</div>
                        </div>
                        <div class="col-2 col-lg-1 text-center">
                            <div
                                v-bind:class="`driver-img club-${member.clubId}`"
                            ></div>
                        </div>
                        <div class="col-6 col-lg-7">
                            <DriverTag
                                v-bind:lastName="member.lastName"
                                v-bind:firstName="member.firstName"
                                v-bind:licenseLevel="member.licenseLevel"
                                v-bind:iRating="member.iRating"
                                v-bind:safetyRating="member.safetyRating"
                                v-bind:teamName="member.teamName"
                                v-bind:clubId="member.clubId"
                                v-bind:driverId="member.custId"
                                v-bind:leagueId="props.league"
                            />
                        </div>
                    </div>
                    <div class="row">
                        <!-- <div class="col text-center">&#x25BC;</div> -->
                        <div class="col text-center" style="height: 1em"></div>
                    </div>
                </template>
                <div
                    class="row"
                    v-if="view.drivers.length !== 0 && summary_mode"
                >
                    <RouterLink
                        class="dropdown-item"
                        type="button"
                        v-bind:to="`?m=standings&league=${props.league}&season=${props.season}`"
                        >See all Standings</RouterLink
                    >
                </div>
                <div class="row" v-if="view.drivers.length === 0">
                    Standings not Available
                </div>
            </div>
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
