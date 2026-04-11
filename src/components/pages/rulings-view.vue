<script setup lang="ts">
import LeagueSeasonMenu from '@@/src/components/nav/league-season-menu.vue';
import PenaltyLedger from '@@/src/components/steward/penalty-ledger.vue';

const props = defineProps<{
    league: string;
    season: string;
}>();
</script>

<template>
    <LeagueSeasonMenu
        v-if="props.league && props.season"
        target-page="rulings"
        v-bind:league="props.league"
        v-bind:season="props.season"
    />
    <PenaltyLedger
        v-if="props.league && props.season"
        v-bind:league="props.league"
        v-bind:season="props.season"
    />
</template>
