<script setup lang="ts">
import { useRoute } from 'vue-router';
import DriverStandings from '@@/src/components/driver/driver-standings.vue';

const route = useRoute();
</script>

<template>
    <DriverStandings
        v-bind:season="(route.query.season as string)"
        v-bind:league="(route.query.league as string)"
    />
</template>
