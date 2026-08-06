<script setup lang="ts">
/**
 * The league's real team championship, as published.
 *
 * Two things this deliberately does not do:
 *
 *  - No `TeamTag`, no `.team-{id}` logo classes. srhweb's `team_id` is
 *    simracerhub's own ID space (33989–33999); the curated team map this app
 *    keys logos and `?m=team` links off runs 1–27. Passing one where the other
 *    is expected renders '----' and links nowhere. The drivers are linkable,
 *    so link those instead.
 *  - No shared column names with the driver table. Every counting stat here is
 *    a sum across the roster — a nine-driver team reaches 14 podiums in a
 *    ten-race season — so each header says "(roster)" and the footnote says it
 *    again.
 */
import type { SrhTeamRow } from '@@/src/models/driver/srh-standings-model';
import SrhPointsBar from '../driver/srh-points-bar.vue';
import PositionMovement from '../driver/position-movement.vue';
import RouterLinkProxy from '@@/src/components/nav/router-link-proxy.vue';

const props = defineProps<{
    teams: SrhTeamRow[];
    leagueId: string;
    custIdsByName?: Record<string, string>;
}>();
</script>

<template>
    <section v-if="props.teams.length" class="section">
        <header class="section__head">
            <span class="section__title">Team Championship</span>
        </header>

        <div class="table-scroll">
            <table class="team-table">
                <thead>
                    <tr>
                        <th class="num-col">Pos</th>
                        <th>Team</th>
                        <th class="num-col">Points</th>
                        <th class="num-col d-none d-md-table-cell">
                            Wins (roster)
                        </th>
                        <th class="num-col d-none d-md-table-cell">
                            Podiums (roster)
                        </th>
                        <th class="num-col d-none d-lg-table-cell">
                            Starts (roster)
                        </th>
                        <th class="d-none d-lg-table-cell">Drivers</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="t in props.teams" v-bind:key="t.teamId">
                        <td class="num num-col">
                            <span>{{ t.position }}</span>
                            <span
                                v-if="t.isTied"
                                class="tied"
                                title="Tied on position"
                                >=</span
                            >
                        </td>
                        <td class="team-name">
                            {{ t.teamName }}
                            <PositionMovement
                                v-if="t.positionChange !== 0"
                                v-bind:change="t.positionChange"
                            />
                        </td>
                        <td class="num num-col">
                            <div class="pts">
                                <span>{{ t.points.total }}</span>
                                <SrhPointsBar v-bind:points="t.points" />
                            </div>
                        </td>
                        <td class="num num-col d-none d-md-table-cell">
                            {{ t.rosterWins }}
                        </td>
                        <td class="num num-col d-none d-md-table-cell">
                            {{ t.rosterPodiums }}
                        </td>
                        <td class="num num-col d-none d-lg-table-cell">
                            {{ t.rosterStarts }}
                        </td>
                        <td class="drivers d-none d-lg-table-cell">
                            <template
                                v-for="(name, i) in t.driverNames"
                                v-bind:key="t.custIds[i]"
                            >
                                <RouterLinkProxy
                                    v-bind:to="`?m=driver&league=${props.leagueId}&driver=${t.custIds[i]}`"
                                    >{{ name }}</RouterLinkProxy
                                ><span v-if="i < t.driverNames.length - 1"
                                    >,
                                </span>
                            </template>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <p class="footnote">
            Team figures are sums across the roster, so they can exceed what any
            single driver ran.
        </p>
    </section>
</template>

<style scoped>
.table-scroll {
    overflow-x: auto;
}

.team-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
}

.team-table th,
.team-table td {
    padding: 0.35rem 0.5rem;
    text-align: left;
    border-bottom: 1px solid var(--border, #30363d);
    white-space: nowrap;
}

.team-table th {
    color: var(--text-secondary, #8b949e);
    font-weight: 400;
    font-size: 0.75rem;
    letter-spacing: 0.03em;
    text-transform: uppercase;
}

.num-col {
    text-align: right;
}

.team-name {
    display: flex;
    align-items: center;
    gap: 0.4rem;
}

.tied {
    color: var(--text-secondary, #8b949e);
    margin-left: 0.15rem;
}

.pts {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.15rem;
}

.drivers {
    white-space: normal;
    color: var(--text-secondary, #8b949e);
}

.footnote {
    color: var(--text-secondary, #8b949e);
    font-size: 0.75rem;
    margin: 0.5rem 0 0;
}
</style>
