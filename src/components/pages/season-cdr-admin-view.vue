<script setup lang="ts">
import { watchEffect } from 'vue';
import { useRouter } from 'vue-router';

import { SignedIn } from 'vue-clerk';
import { useAuth } from 'vue-clerk';

import SeasonCdrAdmin from '@@/src/components/admin/season-cdr-admin.vue';

const { isLoaded, isSignedIn } = useAuth();

const router = useRouter();

const props = defineProps<{
    league: string;
    season: string;
}>();

async function fetchModel() {
    // Wait until Clerk has hydrated before deciding. Otherwise the initial
    // (still-loading) pass sees isSignedIn=false and bounces a signed-in
    // user straight back to the home page.
    if (isLoaded.value && !isSignedIn.value) {
        router.replace({ path: '' });
    }
}

watchEffect(fetchModel);
</script>

<template>
    <SignedIn>
        <SeasonCdrAdmin
            v-bind:league="props.league"
            v-bind:season="props.season"
        ></SeasonCdrAdmin>
    </SignedIn>
</template>
