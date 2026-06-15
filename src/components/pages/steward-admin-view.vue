<script setup lang="ts">
import { watchEffect } from 'vue';
import { useRouter } from 'vue-router';
import { SignedIn, useAuth } from 'vue-clerk';
import StewardConfigAdmin from '@@/src/components/admin/steward-config-admin.vue';

const props = defineProps<{
    league: string;
}>();

const { isLoaded, isSignedIn } = useAuth();
const router = useRouter();

async function fetchModel() {
    // Wait until Clerk has hydrated before redirecting, otherwise the
    // still-loading initial pass bounces a signed-in user back to home.
    if (isLoaded.value && !isSignedIn.value) {
        router.replace({ path: '' });
    }
}

watchEffect(fetchModel);
</script>

<template>
    <SignedIn>
        <StewardConfigAdmin v-if="props.league" v-bind:league="props.league" />
    </SignedIn>
</template>
