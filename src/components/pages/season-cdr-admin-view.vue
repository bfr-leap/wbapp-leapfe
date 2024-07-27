<script setup lang="ts">
import { watchEffect } from 'vue';
import { useRouter } from 'vue-router';

import { SignedIn } from 'vue-clerk';
import { useAuth } from 'vue-clerk';

import LeagueSeasonMenu from '@/components/nav/league-season-menu.vue';
import SeasonCdrAdmin from '@/components/admin/season-cdr-admin.vue';

const { isSignedIn } = useAuth();

const router = useRouter();

const props = defineProps<{
    league: string;
    season: string;
}>();

async function fetchModel() {
    if (!isSignedIn.value) {
        router.replace({ path: '' });
    }
}

watchEffect(fetchModel);
</script>

<template>
    <SignedIn>
        <LeagueSeasonMenu
            v-if="props.league && props.season"
            target-page="season-cdr-admin"
            v-bind:league="props.league"
            v-bind:season="props.season"
        />
        <SeasonCdrAdmin
            v-bind:league="props.league"
            v-bind:season="props.season"
        ></SeasonCdrAdmin>
    </SignedIn>
</template>
