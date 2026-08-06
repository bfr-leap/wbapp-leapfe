<script setup lang="ts">
import { SignedIn, SignedOut, RedirectToSignUp, useAuth } from 'vue-clerk';
import { watch, ref, computed } from 'vue';
import type { Ref } from 'vue';

/**
 * Master switch for the sign-up gate.
 *
 * When `true`, every link behaves as it does for a signed-in user: a real
 * `RouterLink` to `props.to`, no `#` href, no redirect to sign-up. When
 * `false`, signed-out visitors get the gated link that bounces them to
 * sign-up on click.
 *
 * This is a deliberate manual toggle rather than an env var or a feature
 * flag: the gate is a recruiting-season decision, flipped by hand for a
 * stretch of weeks and then flipped back. Keeping it in source means the
 * state is visible in review and in git history rather than in a dashboard
 * nobody remembers to check.
 *
 * The gate itself is NOT removed by this — every call site keeps using this
 * component, so flipping the constant re-arms it everywhere at once.
 *
 * NOTE: this only affects the client. Server-rendered markup has always
 * carried real links (see the fallback branch below), so search engines and
 * link previews are unaffected either way.
 */
const OPEN_LINKS_FOR_EVERYONE = true;

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

// The Clerk-aware branches only run when the gate is armed. With the gate
// open the fallback below handles every case, which is exactly the
// signed-in rendering — a real link to `props.to`.
const gated = computed(() => clerkReady.value && !OPEN_LINKS_FOR_EVERYONE);

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
    <SignedIn v-if="isClient && gated">
        <RouterLink
            v-bind:style="props.style"
            v-bind:class="props.class"
            v-bind:type="props.type"
            v-bind:to="props.to"
        >
            <slot />
        </RouterLink>
    </SignedIn>
    <SignedOut v-if="isClient && gated">
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

    <!-- Renders during SSR, before client mount, while Clerk is still
         booting, and whenever the gate is open. Keeps the slot visible so
         server-rendered content (driver names, etc.) survives hydration even
         if Clerk never reaches a settled state (e.g. fixture-mode smoke /
         audit runs against a stub publishable key) — and, with
         OPEN_LINKS_FOR_EVERYONE set, is the only branch that renders. -->
    <RouterLink
        v-if="!isClient || !gated"
        @click="onClick()"
        v-bind:style="props.style"
        v-bind:class="props.class"
        v-bind:type="props.type"
        v-bind:to="props.to"
    >
        <slot />
    </RouterLink>
</template>
