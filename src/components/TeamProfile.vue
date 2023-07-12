<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import type { Ref } from 'vue';
import TeamTag from './team-tag.vue';
import {
    getCuratedLeagueTeamsInfo,
    getLeagueDriverStats,
    getSingleMemberData,
} from '@/fetch-util';
import type { DriverStats, DriverStatsMap } from '@/iracing-endpoints';
import { getFirstLastNames, getRoadLicense } from './driverUtils';

const props = defineProps<{
    league: string;
    team: string;
}>();

interface TeamView {
    stats: DriverStats;
}

let defaultTeamView: TeamView = {
    stats: {
        cust_id: 0,
        started: 0,
        finished: 0,
        wins: 0,
        podiums: 0,
        top_10: 0,
        top_20: 0,
        fast_laps: 0,
        hard_charger: 0,
        poles: 0,
        power_points: 0,
        incidents: 0,
    },
};

let view: Ref<TeamView> = ref(JSON.parse(JSON.stringify(defaultTeamView)));

const _driverStatsMap: Ref<{ [name: number]: DriverStatsMap } | null> =
    ref(null);

async function fetchData() {
    const driverStatsMap = await getLeagueDriverStats(props.league);

    _driverStatsMap.value = driverStatsMap;

    let teams = await getCuratedLeagueTeamsInfo(props.league);

    let driverIdsBySeason: { [name: string]: string[] } = {};

    for (let season of teams.seasons) {
        for (let team of season.teams) {
            if (team.team_id.toString() === props.team) {
                let driversList: string[] =
                    driverIdsBySeason[season.season_id] || [];

                team.team_members
                    .map((v) => v.toString())
                    .forEach((v) => driversList.push(v));

                driverIdsBySeason[season.season_id] = driversList;
            }
        }
    }

    let allDrivers: { [name: string]: boolean } = {};

    for (let season in driverIdsBySeason) {
        let teamList = driverIdsBySeason[season];
        for (let driverId of teamList) {
            allDrivers[driverId] = true;

            let statRow =
                driverStatsMap[parseInt(season)]?.[parseInt(driverId)];

            for (let statKey of Object.keys(view.value.stats)) {
                (<any>view.value.stats)[statKey] +=
                    (<any>statRow)?.[statKey] || 0;
            }
        }
    }
}

watchEffect(fetchData);

const statClasses = 'px-2 py-1 m-1 fs-5';
</script>

<template>
    <div class="card bg-dark text-light m-2 sticky-top">
        <div class="card-body p-2">
            <div class="row p-3">
                <div v-bind:class="`driver-img team-${props.team}`"></div>
                <div class="col">
                    <TeamTag
                        v-bind:league-id="props.league"
                        v-bind:team-id="Number.parseInt(props.team, 10)"
                    ></TeamTag>
                </div>
            </div>
        </div>
    </div>

    <div class="card bg-dark text-light m-2">
        <div class="d-flex flex-wrap">
            <div :class="statClasses">
                <span class="name">Starts: </span
                ><span class="value"> {{ view.stats.started }}</span>
            </div>
            <div :class="statClasses">
                <span class="name">Poles: </span
                ><span class="value"> {{ view.stats.poles }}</span>
            </div>
            <div :class="statClasses">
                <span class="name">Wins: </span
                ><span class="value"> {{ view.stats.wins }}</span>
            </div>
            <div :class="statClasses">
                <span class="name">Podiums: </span
                ><span class="value"> {{ view.stats.podiums }}</span>
            </div>
            <div :class="statClasses">
                <span class="name">Top 10: </span
                ><span class="value"> {{ view.stats.top_10 }}</span>
            </div>
            <div :class="statClasses">
                <span class="name">Top 20: </span
                ><span class="value"> {{ view.stats.top_20 }}</span>
            </div>
            <div :class="statClasses">
                <span class="name">LEAP Points: </span
                ><span class="value"> {{ view.stats.power_points }}</span>
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
