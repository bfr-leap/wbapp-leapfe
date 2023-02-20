<script setup lang="ts">
import { getMemberViewFromM_Memeber, getRoadLicense } from './driverUtils';
import { RouterLink } from 'vue-router';
import { ref, watch, watchEffect } from 'vue';
import type { Ref } from 'vue';
import type {
    MembersData,
    M_License,
    SeasonSimsessionIndex,
    CuratedLeagueTeamsInfo,
    CLTI_Team,
    DriverStatsMap,
} from '../iracing-endpoints';
import {
    getCuratedLeagueTeamsInfo,
    getLeagueDriverStats,
    getMembersData,
    getSeasonSimsessionIndex,
} from '@/fetch-util';
import DriverTag from './DriverTag.vue';
import LeagueSeasonMenu from './LeagueSeasonMenu.vue';

const props = withDefaults(
    defineProps<{
        league: string;
        season: string;
        summary_mode?: boolean;
    }>(),
    { summary_mode: false }
);

interface TeamView {
    position: number;
    points: number;
    teamName: string;
    teamId: number;
    drivers: {
        name: string;
        custId: string;
    }[];
}
interface DriverView {
    position: number;
    points: number;
    clubId: number;
    lastName: string;
    firstName: string;
    iRating: string;
    licenseLevel: string;
    safetyRating: string;
    teamName: string;
    teamId: number;
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
}

interface LocalView {
    drivers: DriverView[];
    teams: TeamView[];
}

let view: Ref<LocalView> = ref({
    drivers: [],
    teams: [],
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
    >[
        await getLeagueDriverStats(props.league),
        await getCuratedLeagueTeamsInfo(props.league),
        await getMembersData(props.league, props.season),
        await getSeasonSimsessionIndex(props.league),
    ];

    let _seasonId = Number.parseInt(props.season);

    let _userTeamIdMap: { [name: number]: number } = {};
    let _teamInfoMap: { [name: number]: CLTI_Team } = {};
    populateTeamInfoMaps(
        _curatedLeagueTeamsInfo,
        _seasonId,
        _userTeamIdMap,
        _teamInfoMap
    );

    let sortedM = _driverStatsMap
        ? _membersData?.members.sort((a, b) =>
              _driverStatsMap[_seasonId][b.cust_id].power_points !==
              _driverStatsMap[_seasonId][a.cust_id].power_points
                  ? _driverStatsMap[_seasonId][b.cust_id].power_points -
                    _driverStatsMap[_seasonId][a.cust_id].power_points
                  : (getRoadLicense(b.licenses).irating | 0) -
                    (getRoadLicense(a.licenses).irating | 0)
          )
        : [];

    view.value.drivers = [];
    let allDrivers: DriverView[] = [];

    let position = 1;

    for (let member of sortedM) {
        const memberView = getMemberViewFromM_Memeber(
            member,
            _userTeamIdMap,
            _teamInfoMap
        );

        let dv: DriverView = {
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
        };
        ++position;

        allDrivers.push(dv);

        if (!props.summary_mode || position <= 4) {
            view.value.drivers.push(dv);
        }
    }

    let teamViewMap: { [name: string]: TeamView } = {};
    for (let driver of allDrivers) {
        let team = teamViewMap[driver.teamName];
        if (!team) {
            teamViewMap[driver.teamName] = team = {
                position: -1,
                points: 0,
                teamName: driver.teamName,
                teamId: driver.teamId,
                drivers: [],
            };
        }

        team.drivers.push({
            name: `${driver.lastName.toUpperCase}, ${driver.firstName}`,
            custId: driver.custId,
        });

        team.points += driver.points;
    }
    let teamsA = Object.keys(teamViewMap)
        .map((k) => teamViewMap[k])
        .sort((a, b) => b.points - a.points);

    teamsA.forEach((v, i) => {
        v.position = i + 1;
    });

    if (props.summary_mode) {
        teamsA = teamsA.filter((v) => v.position <= 3);
    }

    console.log(teamsA);
    view.value.teams = teamsA;
}
watchEffect(fectchJsonData);
watch(props, fectchJsonData);
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

    <div v-if="view.teams.length > 1" class="card bg-dark text-light m-2">
        <div class="card-body p-2">
            <div class="container">
                <div v-if="view.teams.length !== 0" class="row">
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
                    <div class="col-6 col-lg-7 text-left">Team</div>
                </div>

                <template
                    v-if="view.teams.length !== 0"
                    v-for="(team, i) in view.teams"
                >
                    <div class="row">
                        <div
                            class="col-2 justify-content-center d-flex d-sm-none text-center flex-column"
                        >
                            <div class="fs-2 mx-1">
                                {{ team.position }}
                            </div>
                            <div class="d-flex fs-7 justify-content-center">
                                <span>{{ team.points }}</span>
                            </div>
                        </div>
                        <div
                            class="col-2 d-none d-sm-flex justify-content-center fs-2"
                        >
                            <div>{{ team.position }}</div>
                        </div>
                        <div
                            class="col-2 d-none d-sm-flex justify-content-center fs-4"
                        >
                            <div>{{ team.points }}</div>
                        </div>
                        <div class="col-2 col-lg-1 text-center">
                            <div
                                v-bind:class="`driver-img team-${team.teamId}`"
                            ></div>
                        </div>
                        <div class="col-6 col-lg-7">
                            <!-- <DriverTag
                                v-bind:lastName="member.lastName"
                                v-bind:firstName="member.firstName"
                                v-bind:licenseLevel="member.licenseLevel"
                                v-bind:iRating="member.iRating"
                                v-bind:safetyRating="member.safetyRating"
                                v-bind:teamName="member.teamName"
                                v-bind:clubId="member.clubId"
                                v-bind:driverId="member.custId"
                                v-bind:leagueId="props.league"
                            /> -->
                            {{ team.teamName }}
                        </div>
                    </div>
                    <div class="row">
                        <!-- <div class="col text-center">&#x25BC;</div> -->
                        <div class="col text-center" style="height: 1em"></div>
                    </div>
                </template>
                <div class="row" v-if="view.teams.length !== 0 && summary_mode">
                    <RouterLink
                        class="dropdown-item"
                        type="button"
                        v-bind:to="`?m=standings&league=${props.league}&season=${props.season}`"
                        >See all Standings</RouterLink
                    >
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
.club-12,
.club-21,
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

.club-15 {
    background-image: url(/flags/canada.png);
}

.club-50 {
    background-image: url(/flags/southafrica.png);
}

.club-42 {
    background-image: url(/flags/deatch.png);
}
/* team_name: Nox, */
.team-1 {
    background-color: white;
    background-image: url(/teams/nox.png);
}

/* team_name: Lumos, */
.team-2 {
    background-color: black;
    background-image: url(/teams/lumos.png);
}

/* team_name: GitGud Racing, */
.team-3 {
    background-color: black;
    background-image: url(/teams/gitgud.png);
}

/* team_name: Orion Legendary Racing, */
.team-4 {
    background-color: white;
    background-image: url(/teams/orion.png);
}

/* team_name: Mercury Motorsports, */
.team-8 {
    background-color: black;
    background-image: url(/teams/mercury.png);
}

/* team_name: Team Banana, */
.team-11 {
    background-image: url(/teams/banana.png);
}

/* team_name: Bieser Racing Team, */
.team-19 {
    background-color: black;
    background-image: url(/teams/bieser.png);
}

/* team_name: Maxwell Racing Team, */
.team-23 {
    background-image: url(/teams/maxwell.png);
}

/* team_name: Wolf Pack Racing, */
.team-24 {
    background-color: rgba(255, 255, 255, 0.153);
    background-image: url(/teams/wolfpack.png);
}

/* team_name: Intend Sim Racing, */
.team-25 {
    background-color: rgba(74, 0, 0, 0.267);
}

/* team_name: B Team, */
.team-26 {
}

/* team_name: Alkentech NHR, */
.team-27 {
}
</style>
