<script setup lang="ts">
import { SignedIn, SignedOut, RedirectToSignUp, useAuth } from 'vue-clerk';
import { watch, ref, computed } from 'vue';
import type { Ref } from 'vue';

const props = defineProps<{
    style?: Record<string, string>;
    class?: string;
    type?: string;
    to: string;
}>();

let forward: Ref<boolean> = ref(false);
let isClient: Ref<boolean> = ref(false);

// `vue-clerk` reports `isLoaded` once the SDK has resolved the
// session state. Before that, both `<SignedIn>` and `<SignedOut>`
// render nothing — which would hide our slot (driver names, page
// titles, etc.) until Clerk finishes booting. We render the plain
// fallback link until `isLoaded` flips so the slot is always visible.
const { isLoaded } = useAuth();
const clerkReady = computed(() => isLoaded?.value === true);

function onClick() {
    forward.value = true;
}

// Reset redirect state when navigating to a different target
watch(
    () => props.to,
    () => {
        forward.value = false;
    }
);

// Determine if we're on the client-side
onMounted(() => {
    isClient.value = true;
});
</script>
<template>
    <SignedIn v-if="isClient && clerkReady">
        <RouterLink
            v-bind:style="props.style"
            v-bind:class="props.class"
            v-bind:type="props.type"
            v-bind:to="props.to"
        >
            <slot />
        </RouterLink>
    </SignedIn>
    <SignedOut v-if="isClient && clerkReady">
        <RouterLink
            @click="onClick()"
            v-bind:style="props.style"
            v-bind:class="props.class"
            v-bind:type="props.type"
            to="#"
        >
            <slot />
            <RedirectToSignUp v-if="forward"></RedirectToSignUp>
        </RouterLink>
    </SignedOut>

    <!-- Renders during SSR, before client mount, and while Clerk is
         still booting. Keeps the slot visible so server-rendered
         content (driver names, etc.) survives hydration even if
         Clerk never reaches a settled state (e.g. fixture-mode
         smoke / audit runs against a stub publishable key). -->
    <RouterLink
        v-if="!isClient || !clerkReady"
        @click="onClick()"
        v-bind:style="props.style"
        v-bind:class="props.class"
        v-bind:type="props.type"
        v-bind:to="props.to"
    >
        <slot />
    </RouterLink>
</template>
