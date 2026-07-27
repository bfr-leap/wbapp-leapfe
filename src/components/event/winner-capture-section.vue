<script setup lang="ts">
import { toRef } from 'vue';

const props = defineProps<{
    src: string;
    title: string;
}>();

const { failed, onError } = useImageFallback(toRef(props, 'src'));
</script>

<template>
    <section v-if="src && !failed" class="section">
        <header class="section__head">
            <span class="section__title">{{ title }}</span>
        </header>
        <img
            class="winner-capture"
            v-bind:src="src"
            alt="Winner finish-line capture"
            loading="lazy"
            @error="onError"
        />
    </section>
</template>

<style scoped>
.winner-capture {
    display: block;
    width: 100%;
    max-width: 640px;
    height: auto;
    border-radius: var(--radius-md, 8px);
    border: 1px solid var(--border-subtle);
    background: var(--surface-2);
}
</style>
