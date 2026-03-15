<script setup lang="ts">
import type { Ref } from 'vue';
import DriverTag from './driver-tag.vue';
import TeamTag from '../team/team-tag.vue';
import LeagueSeasonMenu from '@@/src/components/nav/league-season-menu.vue';
import type { DriverStandingsModel } from '@@/src/models/driver/driver-standings-model';
import {
    getDriverStandingsModel,
    getDefaultStandingsModel,
} from '@@/src/models/driver/driver-standings-model';
import RouterLinkProxy from '@@/src/components/nav/router-link-proxy.vue';

const props = defineProps<{
    league: string;
    season: string;
    summary_mode?: boolean;
}>();

async function fetchModel() {
    return await getDriverStandingsModel(
        props.league,
        props.season,
        props.summary_mode === true
    );
}

const view: Ref<DriverStandingsModel> =
    await asyncDataWithReactiveModel<DriverStandingsModel>(
        `DriverStandingsModel-${props.league}-${props.season}-${
            props.summary_mode === true
        }`,
        fetchModel,
        getDefaultStandingsModel,
        [() => props.league, () => props.season, () => props.summary_mode]
    );
</script>

<template>
    <LeagueSeasonMenu
        v-if="!summary_mode && view.leagueId && view.seasonId"
        targetPage="standings"
        v-bind:league="view.leagueId"
        v-bind:season="view.seasonId"
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
                                v-bind:teamId="member.teamId?.toString()"
                                v-bind:leagueId="view.leagueId"
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
                    <RouterLinkProxy
                        class="dropdown-item"
                        type="button"
                        v-bind:to="`?m=standings&league=${view.leagueId}&season=${view.seasonId}`"
                        >See all Standings
                    </RouterLinkProxy>
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
                    <div v-if="team.teamId" class="row">
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
                            <!-- <RouterLinkProxy
                                class="dropdown-item"
                                type="button"
                                v-bind:to="`?m=team&league=${props.league}&team=${team.teamId}`"
                            >
                                {{ team.teamName }}</RouterLinkProxy
                            > -->
                            <TeamTag
                                v-bind:league-id="view.leagueId"
                                v-bind:team-id="team.teamId"
                            ></TeamTag>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col text-center" style="height: 1em"></div>
                    </div>
                </template>
                <div class="row" v-if="view.teams.length !== 0 && summary_mode">
                    <RouterLinkProxy
                        class="dropdown-item"
                        type="button"
                        v-bind:to="`?m=standings&league=${view.leagueId}&season=${view.seasonId}`"
                        >See all Standings
                    </RouterLinkProxy>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.driver-img {
    height: 3em;
    width: 3em;
    background-color: var(--gh-neutral-emphasis);
    border-radius: var(--gh-radius-full);
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

.club-39 {
    background-image: url(/flags/france.png);
}

.club-24 {
    background-image: url(/flags/hispanoamerica.jpg);
}

.club-48 {
    background-image: url(/flags/japan.jpg);
}

.club-19 {
    background-image: url(/flags/usa.png);
}

.club-47 {
    background-image: url(/flags/asia.jpg);
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
/* .team-26 {} */

/* team_name: Alkentech NHR, */
/* .team-27 {} */
</style>
