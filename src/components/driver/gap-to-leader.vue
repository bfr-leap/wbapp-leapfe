<script setup lang="ts">
const props = defineProps<{
    /** Points behind leader. 0 for the leader themselves. */
    gap: number;
}>();
</script>

<template>
    <span
        v-if="gap === 0"
        class="gap gap--leader"
        title="Championship leader"
        >LEAD</span
    >
    <span
        v-else
        class="gap gap--behind"
        v-bind:title="`${gap} points behind leader`"
        >−{{ gap }}</span
    >
</template>

<style scoped>
.gap {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    font-weight: 600;
    line-height: 1;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
}
.gap--leader {
    color: var(--accent, #2f81f7);
    font-weight: 700;
    letter-spacing: 0.08em;
    padding: 2px 5px;
    border: 1px solid var(--accent, #2f81f7);
    border-radius: var(--radius-sm, 3px);
    font-size: 0.62rem;
}
.gap--behind {
    color: var(--text-muted, #8b949e);
    opacity: 0.85;
}
</style>
