<script setup lang="ts">
import { SignedIn, SignedOut, RedirectToSignUp } from 'vue-clerk';
import { watchEffect, Ref, ref } from 'vue';

const props = defineProps<{
    style?: string;
    class?: string;
    type?: string;
    to: string;
}>();

let forward: Ref<boolean> = ref(false);

async function fetchModel() {}

function onClick() {
    forward.value = true;
}

watchEffect(fetchModel);
</script>
<template>
    <SignedIn>
        <RouterLink
            v-bind:style="props.style"
            v-bind:class="props.class"
            v-bind:type="props.type"
            v-bind:to="props.to"
        >
            <slot />
        </RouterLink>
    </SignedIn>
    <SignedOut>
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
</template>
