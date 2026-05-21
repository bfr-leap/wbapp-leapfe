<script setup lang="ts">
const props = defineProps<{
    /** Points behind leader. 0 for the leader themselves. */
    gap: number;
}>();
</script>

<template>
    <!-- The leader's row is self-evident from the P1 position;
         a chip would just add chrome. Render nothing for gap=0. -->
    <span
        v-if="gap > 0"
        class="gap"
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
    color: var(--text-muted, #8b949e);
    opacity: 0.85;
}
</style>
