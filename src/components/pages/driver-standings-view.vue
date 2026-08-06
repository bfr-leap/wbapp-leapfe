<script setup lang="ts">
/**
 * The full-page standings view.
 *
 * This shell is NOT used by the summary cards on the home page or the season
 * profile — those mount `DriverStandings` directly with `summary_mode`. That
 * is why the srhweb-only surfaces are composed here: they get the full page
 * and cannot leak into a summary card.
 */
import type { Ref } from 'vue';
import DriverStandings from '@@/src/components/driver/driver-standings.vue';
import SrhDropWeekExplorer from '@@/src/components/driver/srh-drop-week-explorer.vue';
import SrhTeamStandings from '@@/src/components/team/srh-team-standings.vue';
import SrhAdjudicationLedger from '@@/src/components/steward/srh-adjudication-ledger.vue';
import type { DriverStandingsModel } from '@@/src/models/driver/driver-standings-model';
import {
    getDriverStandingsModel,
    getDefaultStandingsModel,
} from '@@/src/models/driver/driver-standings-model';

const props = defineProps<{
    league: string;
    season: string;
}>();

async function fetchModel() {
    return await getDriverStandingsModel(props.league, props.season, false);
}

// Same model function and the same cache key shape `DriverStandings` uses, so
// the two documents behind it are fetched once and this only re-derives.
const view: Ref<DriverStandingsModel> =
    await asyncDataWithReactiveModel<DriverStandingsModel>(
        `DriverStandingsModel-${props.league}-${props.season}-false`,
        fetchModel,
        getDefaultStandingsModel,
        [() => props.league, () => props.season]
    );
</script>

<template>
    <!-- Only rendered when the league scores on simracerhub. Everything below
         degrades to nothing for the other leagues, which keep the computed
         standings exactly as before. -->
    <section v-if="view.srh" class="section srh-head">
        <div class="srh-head__row">
            <span class="srh-head__season">{{ view.srh.seasonName }}</span>
            <span class="srh-head__series">{{ view.srh.seriesName }}</span>
        </div>
        <div class="srh-head__meta">
            <span
                >Round {{ view.srh.progress.roundsRun }} of
                {{ view.srh.progress.roundsTotal }}</span
            >
            <span class="sep">·</span>
            <span>{{ view.srh.progress.racesRun }} races scored</span>
            <span class="sep">·</span>
            <span class="source">standings published by the league</span>
        </div>
    </section>

    <DriverStandings
        v-bind:season="props.season"
        v-bind:league="props.league"
    />

    <SrhTeamStandings
        v-if="view.srh"
        v-bind:teams="view.srh.teams"
        v-bind:leagueId="view.leagueId"
    />

    <SrhDropWeekExplorer v-if="view.srh" v-bind:view="view" />

    <SrhAdjudicationLedger v-if="view.srh" v-bind:info="view.srh.info" />
</template>

<style scoped>
.srh-head__row {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
}

.srh-head__season {
    font-size: 1.1rem;
    color: var(--text-primary, #e6edf3);
}

.srh-head__series {
    font-size: 0.8rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--text-secondary, #8b949e);
}

.srh-head__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    font-size: 0.8rem;
    color: var(--text-secondary, #8b949e);
    margin-top: 0.2rem;
}

.srh-head__meta .sep {
    opacity: 0.4;
}

.srh-head__meta .source {
    font-style: italic;
}
</style>
