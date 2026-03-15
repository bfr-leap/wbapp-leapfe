<script setup lang="ts">
import DriverStandings from '@@/src/components/driver/driver-standings.vue';

const props = defineProps<{
    league: string;
    season: string;
}>();
</script>

<template>
    <DriverStandings
        v-bind:season="props.season"
        v-bind:league="props.league"
    />
</template>
