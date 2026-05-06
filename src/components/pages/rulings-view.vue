<script setup lang="ts">
import PenaltyLedger from '@@/src/components/steward/penalty-ledger.vue';

const props = defineProps<{
    league: string;
    season: string;
}>();
</script>

<template>
    <PenaltyLedger
        v-if="props.league && props.season"
        v-bind:league="props.league"
        v-bind:season="props.season"
    />
</template>
