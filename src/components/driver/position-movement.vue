<script setup lang="ts">
const props = defineProps<{
    /** Positive = climbed (good). Negative = lost ground. Zero = no change. */
    change: number;
}>();
</script>

<template>
    <span
        v-if="change > 0"
        class="movement movement--up"
        v-bind:title="`Up ${change} since last race`"
        >▲{{ change }}</span
    >
    <span
        v-else-if="change < 0"
        class="movement movement--down"
        v-bind:title="`Down ${-change} since last race`"
        >▼{{ -change }}</span
    >
    <span v-else class="movement movement--flat" title="No change">–</span>
</template>

<style scoped>
.movement {
    font-family: var(--font-mono);
    font-size: 0.85rem;
    font-weight: 700;
    line-height: 1;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
    white-space: nowrap;
}
.movement--up {
    color: var(--success, #3fb950);
}
.movement--down {
    color: var(--danger, #f85149);
}
.movement--flat {
    color: var(--text-muted, #8b949e);
    opacity: 0.6;
}
</style>
