<script setup lang="ts">
/**
 * The race / bonus / penalty split behind a championship points total.
 *
 * Three deliberate omissions:
 *  - Zero-width segments are never drawn. Only 6 of 23 drivers in the sample
 *    have any bonus and exactly 1 has a penalty, so a always-three-segment bar
 *    would be mostly a lie about precision.
 *  - Nothing renders when the parts don't sum to the total — a bar that
 *    visibly fails to add up is worse than no bar.
 *  - Stage points are absent entirely: identically 0 across every driver and
 *    every team, so a segment for them would assert the league runs stages.
 */
import { computed } from 'vue';
import type { PointsBreakdown } from '@@/src/models/driver/srh-standings-model';

const props = defineProps<{ points: PointsBreakdown }>();

// Penalties subtract, so the bar's full width is what was earned before the
// deduction — that way the penalty segment reads as a bite taken out of the
// total rather than as extra points.
const earned = computed(() => props.points.race + props.points.bonus);
const denominator = computed(() =>
    Math.max(1, earned.value + props.points.penalty)
);
const pct = (n: number) => `${(n / denominator.value) * 100}%`;

const title = computed(() => {
    const parts = [`${props.points.race} race`];
    if (props.points.bonus > 0) parts.push(`+${props.points.bonus} bonus`);
    if (props.points.penalty > 0)
        parts.push(`${props.points.penaltyDisplay} penalty`);
    return `${parts.join(' · ')} = ${props.points.total}`;
});
</script>

<template>
    <div
        v-if="props.points.balances"
        class="pts-bar"
        v-bind:title="title"
        v-bind:aria-label="title"
    >
        <span
            v-if="props.points.race > 0"
            class="seg seg--race"
            v-bind:style="{ width: pct(props.points.race) }"
        ></span>
        <span
            v-if="props.points.bonus > 0"
            class="seg seg--bonus"
            v-bind:style="{ width: pct(props.points.bonus) }"
        ></span>
        <span
            v-if="props.points.penalty > 0"
            class="seg seg--penalty"
            v-bind:style="{ width: pct(props.points.penalty) }"
        ></span>
    </div>
</template>

<style scoped>
.pts-bar {
    display: flex;
    width: 100%;
    max-width: 7rem;
    height: 3px;
    border-radius: 2px;
    overflow: hidden;
    background: var(--surface-3, #22262c);
}

.seg {
    display: block;
    height: 100%;
}

.seg--race {
    background: var(--text-secondary, #8b949e);
}

.seg--bonus {
    background: var(--success, #3fb950);
}

/* Hatched rather than solid: a penalty is a deduction, and reading it as
   "more points, in red" is exactly the wrong intuition. */
.seg--penalty {
    background: repeating-linear-gradient(
        45deg,
        var(--danger, #f85149),
        var(--danger, #f85149) 2px,
        transparent 2px,
        transparent 4px
    );
    background-color: var(--danger, #f85149);
}
</style>
