<script setup lang="ts">
import { useRoute } from 'vue-router';
import TeamProfile from '../components/TeamProfile.vue';

const route = useRoute();
</script>

<template>
    <TeamProfile
        v-bind:league="(route.query.league as string)"
        v-bind:team="(route.query.team as string)"
    />
</template>
