<script setup lang="ts">
import SeasonCdrAdmin from '@/components/admin/season-cdr-admin.vue';

const props = defineProps<{
    league: string;
    season: string;
}>();
</script>

<template>
    <SeasonCdrAdmin
        v-bind:league="props.league"
        v-bind:season="props.season"
    ></SeasonCdrAdmin>
</template>
