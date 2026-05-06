<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import type { Ref } from 'vue';
import TeamTag from './team-tag.vue';
import type { TeamProfileModel } from '@@/src/models/team/team-profile-model';
import {
    getDefaultTeamProfileModel,
    getTeamProfileModel,
} from '@@/src/models/team/team-profile-model';

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
    <div class="page">
        <section class="section team-header">
            <div v-bind:class="`driver-img team-${props.team}`"></div>
            <TeamTag
                v-bind:league-id="props.league"
                v-bind:team-id="Number.parseInt(props.team, 10)"
            ></TeamTag>
        </section>

        <section class="section">
            <header class="section__head">
                <span class="section__title">Stats</span>
            </header>
            <div class="stats-row">
                <div class="stat-cell">
                    <span class="stat-cell__label">Starts</span>
                    <span class="stat-cell__value num">{{
                        teamProfileModel.stats.started
                    }}</span>
                </div>
                <div class="stat-cell">
                    <span class="stat-cell__label">Poles</span>
                    <span class="stat-cell__value num">{{
                        teamProfileModel.stats.poles
                    }}</span>
                </div>
                <div class="stat-cell">
                    <span class="stat-cell__label">Wins</span>
                    <span class="stat-cell__value num">{{
                        teamProfileModel.stats.wins
                    }}</span>
                </div>
                <div class="stat-cell">
                    <span class="stat-cell__label">Podiums</span>
                    <span class="stat-cell__value num">{{
                        teamProfileModel.stats.podiums
                    }}</span>
                </div>
                <div class="stat-cell">
                    <span class="stat-cell__label">Top 10</span>
                    <span class="stat-cell__value num">{{
                        teamProfileModel.stats.top_10
                    }}</span>
                </div>
                <div class="stat-cell">
                    <span class="stat-cell__label">Top 20</span>
                    <span class="stat-cell__value num">{{
                        teamProfileModel.stats.top_20
                    }}</span>
                </div>
                <div class="stat-cell">
                    <span class="stat-cell__label">LEAP Points</span>
                    <span class="stat-cell__value num">{{
                        teamProfileModel.stats.power_points
                    }}</span>
                </div>
            </div>
        </section>
    </div>
</template>

<style scoped>
.team-header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
}

.stats-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4);
}
.stat-cell {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
}
.stat-cell__label {
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: var(--tracking-wide);
    color: var(--text-muted);
    font-weight: 600;
}
.stat-cell__value {
    font-size: var(--text-xl);
    font-weight: 600;
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
}

.driver-img {
    height: 3em;
    width: 3em;
    background-color: var(--surface-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--gh-radius-full);
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
/* .team-26 {} */

/* team_name: Alkentech NHR, */
/* .team-27 {} */
</style>
