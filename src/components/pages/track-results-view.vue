<script setup lang="ts">
import { useRoute } from 'vue-router';
import TrackResults from '../track/track-results.vue';

const route = useRoute();
</script>

<template>
    <TrackResults
        v-bind:league="(route.query.league as string)"
        v-bind:car="(route.query.car as string)"
        v-bind:track="(route.query.track as string)"
    />
</template>
