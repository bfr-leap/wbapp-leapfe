<script setup lang="ts">
import { RouterLink } from 'vue-router';
import ResultsTable from '@@/src/components/event/results-table.vue';
import type {
    DriverStats,
    DriverResults,
} from '@@/lplib/endpoint-types/iracing-endpoints';
import BarChart from '@@/src/components/vis/bar-chart.vue';
import HLBarChart from '../vis/hl-bar-chart.vue';
import { ref, watchEffect } from 'vue';
import type { Ref } from 'vue';
import {
    getDriverStatsModel,
    getDefaultDriverStatsModel,
} from '@@/src/models/driver/driver-stats-model';
import type { DriverStatsModel } from '@@/src/models/driver/driver-stats-model';

import RouterLinkProxy from '@@/src/components/nav/router-link-proxy.vue';

export interface ResultsCollection {
    race: DriverResults;
    sprint: DriverResults;
    quali: DriverResults;
}

const props = defineProps<{
    stats: DriverStats;
    results: {
        race: DriverResults;
        sprint: DriverResults;
        quali: DriverResults;
    };
    seasonName: string;
    leagueId: string;
    seasonId: number;
}>();

async function fetchModel() {
    return await getDriverStatsModel(
        props.results.quali,
        props.results?.race,
        props.results?.sprint,
        props.seasonId,
        props.leagueId
    );
}
watchEffect(fetchModel);

const driverStatsModel: Ref<DriverStatsModel> =
    await asyncDataWithReactiveModel<DriverStatsModel>(
        `DriverStatsModel-${[
            props.results.quali,
            props.results?.race,
            props.results?.sprint,
            props.seasonId,
            props.leagueId,
        ]
            .map((v) => v.toString())
            .join('-')}`,
        fetchModel,
        getDefaultDriverStatsModel,
        [
            () => props.stats,
            () => props.results,
            () => props.seasonName,
            () => props.leagueId,
            () => props.seasonId,
        ]
    );


</script>

<template>
    <div class="gh-section-title">
        <RouterLinkProxy
            class="link-light"
            v-if="props.seasonId"
            :to="`/?m=standings&league=${props.leagueId}&season=${props.seasonId}`"
            >{{ props.seasonName+" "+props.seasonId }}</RouterLinkProxy
        >
        <span v-else>{{ driverStatsModel.seasonName }}</span>
    </div>

    <!-- ── Stats grid ────────────────────────────────────────── -->
    <div class="gh-stats-row">
        <div class="gh-stat">
            <span class="gh-stat-value">{{ props.stats.started }}</span>
            <span class="gh-stat-label">Starts</span>
        </div>
        <div class="gh-stat">
            <span class="gh-stat-value">{{ props.stats.poles }}</span>
            <span class="gh-stat-label">Poles</span>
        </div>
        <div class="gh-stat">
            <span class="gh-stat-value">{{ props.stats.wins }}</span>
            <span class="gh-stat-label">Wins</span>
        </div>
        <div class="gh-stat">
            <span class="gh-stat-value">{{ props.stats.podiums }}</span>
            <span class="gh-stat-label">Podiums</span>
        </div>
        <div class="gh-stat">
            <span class="gh-stat-value">{{ props.stats.top_10 }}</span>
            <span class="gh-stat-label">Top 10</span>
        </div>
        <div class="gh-stat">
            <span class="gh-stat-value">{{ props.stats.top_20 }}</span>
            <span class="gh-stat-label">Top 20</span>
        </div>
        <div class="gh-stat">
            <span class="gh-stat-value">{{ props.stats.power_points }}</span>
            <span class="gh-stat-label">LEAP Points</span>
        </div>
    </div>

    <!-- ── Charts / Tables nav ───────────────────────────────── -->
    <ul class="nav nav-pills gh-tab-nav">
        <li class="nav-item dropdown">
            <a
                class="nav-link dropdown-toggle active show"
                data-bs-toggle="dropdown"
                href="#"
                role="button"
                aria-expanded="false"
                >Charts</a
            >
            <ul class="dropdown-menu">
                <li>
                    <a
                        class="dropdown-item active"
                        data-bs-toggle="tab"
                        v-bind:data-bs-target="`#nav-qpchart-${props.seasonId}`"
                        href="#"
                    >
                        Qualifying Performance
                    </a>
                </li>
                <li>
                    <a
                        class="dropdown-item"
                        data-bs-toggle="tab"
                        v-bind:data-bs-target="`#nav-sechart-${props.seasonId}`"
                        href="#"
                    >
                        Start / Finish
                    </a>
                </li>
            </ul>
        </li>
        <li class="nav-item dropdown">
            <a
                class="nav-link dropdown-toggle"
                data-bs-toggle="dropdown"
                href="#"
                role="button"
                aria-expanded="false"
                >Tables</a
            >
            <ul class="dropdown-menu">
                <template v-for="(result, i) in props.results">
                    <li v-if="result && result[props.seasonId]">
                        <a
                            class="dropdown-item"
                            data-bs-toggle="tab"
                            v-bind:data-bs-target="`#nav-${i}-${props.seasonId}`"
                            href="#"
                        >
                            {{ i }}
                        </a>
                    </li>
                </template>
            </ul>
        </li>
    </ul>
    <div class="tab-content gh-tab-content" id="nav-tabContent">
        <div
            class="tab-pane fade show active"
            v-bind:id="`nav-qpchart-${props.seasonId}`"
            role="tabpanel"
            tabindex="0"
        >
            <div class="gh-chart-title">Qualifying Performance</div>
            <BarChart
                v-if="driverStatsModel.qualifyingChartData"
                :data="driverStatsModel.qualifyingChartData"
            />
        </div>
        <div
            class="tab-pane fade"
            v-bind:id="`nav-sechart-${seasonId}`"
            role="tabpanel"
            tabindex="0"
        >
            <div class="gh-chart-title">Start / Finish</div>
            <HLBarChart
                v-if="driverStatsModel.startFinishChartData"
                v-bind:data="driverStatsModel.startFinishChartData"
            />
        </div>
        <template v-for="(result, i) in props.results">
            <div
                class="tab-pane fade"
                v-bind:id="`nav-${i}-${props.seasonId}`"
                role="tabpanel"
                tabindex="0"
            >
                <div
                    class="gh-chart-title"
                    v-if="result && result[props.seasonId]"
                >
                    {{ i }}
                </div>
                <ResultsTable
                    :seasonId="props.seasonId"
                    :results="result"
                    v-bind:leagueId="props.leagueId"
                />
            </div>
        </template>
    </div>
</template>

<style scoped>
.gh-section-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--gh-fg-default);
    padding-bottom: 8px;
    border-bottom: 1px solid var(--gh-border-muted);
    margin-bottom: 16px;
}

/* ── Stats row — GitHub contribution-style counters ────────── */
.gh-stats-row {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 16px;
}

.gh-stat {
    display: flex;
    align-items: baseline;
    gap: 4px;
    padding: 4px 12px;
    font-size: 0.875rem;
}

.gh-stat-value {
    font-weight: 600;
    font-size: 1.125rem;
    color: var(--gh-fg-default);
}

.gh-stat-label {
    color: var(--gh-fg-muted);
    font-size: 0.75rem;
}

/* ── Tab nav — GitHub-style outlined buttons ─────────────── */
.gh-tab-nav {
    gap: 8px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--gh-border-muted);
    margin-bottom: 16px;
}

.gh-tab-content {
    min-height: 200px;
}

.gh-chart-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--gh-fg-muted);
    margin-bottom: 8px;
}
</style>
