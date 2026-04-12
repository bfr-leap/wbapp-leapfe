<script setup lang="ts">
import { watchEffect } from 'vue';
import { useRouter } from 'vue-router';
import { SignedIn, useAuth } from 'vue-clerk';
import StewardConfigAdmin from '@@/src/components/admin/steward-config-admin.vue';

const props = defineProps<{
    league: string;
}>();

const { isSignedIn } = useAuth();
const router = useRouter();

async function fetchModel() {
    if (!isSignedIn.value) {
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
