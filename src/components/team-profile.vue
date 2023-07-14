<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import type { Ref } from 'vue';
import TeamTag from './team-tag.vue';
import type { TeamProfileModel } from '@/models/team-profile-model';
import {
    getDefaultTeamProfileModel,
    getTeamProfileModel,
} from '@/models/team-profile-model';

const props = defineProps<{
    league: string;
    team: string;
}>();

let teamProfileModel: Ref<TeamProfileModel> = ref(getDefaultTeamProfileModel());

async function fetchModel() {
    teamProfileModel.value = await getTeamProfileModel(
        props.league,
        props.team
    );
}

watchEffect(fetchModel);

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
                ><span class="value">
                    {{ teamProfileModel.stats.started }}</span
                >
            </div>
            <div :class="statClasses">
                <span class="name">Poles: </span
                ><span class="value"> {{ teamProfileModel.stats.poles }}</span>
            </div>
            <div :class="statClasses">
                <span class="name">Wins: </span
                ><span class="value"> {{ teamProfileModel.stats.wins }}</span>
            </div>
            <div :class="statClasses">
                <span class="name">Podiums: </span
                ><span class="value">
                    {{ teamProfileModel.stats.podiums }}</span
                >
            </div>
            <div :class="statClasses">
                <span class="name">Top 10: </span
                ><span class="value"> {{ teamProfileModel.stats.top_10 }}</span>
            </div>
            <div :class="statClasses">
                <span class="name">Top 20: </span
                ><span class="value"> {{ teamProfileModel.stats.top_20 }}</span>
            </div>
            <div :class="statClasses">
                <span class="name">LEAP Points: </span
                ><span class="value">
                    {{ teamProfileModel.stats.power_points }}</span
                >
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
