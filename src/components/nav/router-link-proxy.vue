<script setup lang="ts">
import { SignedIn, SignedOut, RedirectToSignUp } from 'vue-clerk';
import { watchEffect, ref } from 'vue';
import type { Ref } from 'vue';

const props = defineProps<{
    style?: Record<string, string>;
    class?: string;
    type?: string;
    to: string;
}>();

let forward: Ref<boolean> = ref(false);
let isClient: Ref<boolean> = ref(false);

async function fetchModel() {}

function onClick() {
    forward.value = true;
}

watchEffect(fetchModel);

// Determine if we're on the client-side
onMounted(() => {
    isClient.value = true;
});
</script>
<template>
    <SignedIn v-if="isClient">
        <RouterLink
            v-bind:style="props.style"
            v-bind:class="props.class"
            v-bind:type="props.type"
            v-bind:to="props.to"
        >
            <slot />
        </RouterLink>
    </SignedIn>
    <SignedOut v-if="isClient">
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

    <RouterLink
        v-if="!isClient"
        @click="onClick()"
        v-bind:style="props.style"
        v-bind:class="props.class"
        v-bind:type="props.type"
        to="#"
    >
        <slot />
    </RouterLink>

    <!-- <RouterLink
        @click="onClick()"
        v-bind:style="props.style"
        v-bind:class="props.class"
        v-bind:type="props.type"
        to="#"
    >
        <slot />
    </RouterLink> -->
</template>
