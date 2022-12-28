<script setup lang="ts">
import { useRoute } from 'vue-router';
import LeagueIndex from '../components/LeagueIndex.vue';
import DriverStandings from '../components/DriverStandings.vue';

const route = useRoute();
</script>

<template>
    <DriverStandings
        v-bind:season="(route.query.season as string)"
        v-bind:league="(route.query.league as string)"
    />
</template>
