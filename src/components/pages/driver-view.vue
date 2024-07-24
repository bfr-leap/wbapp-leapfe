<script setup lang="ts">
import { useRoute } from 'vue-router';
import DriverProfile from '@/components/driver/driver-profile.vue';

const route = useRoute();
</script>

<template>
    <DriverProfile
        v-bind:league="(route.query.league as string)"
        v-bind:driver="(route.query.driver as string)"
    />
</template>
