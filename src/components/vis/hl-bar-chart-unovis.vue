<script setup lang="ts">
import { computed, toRaw } from 'vue';
import {
    VisXYContainer,
    VisStackedBar,
    VisAxis,
    VisTooltip,
    VisCrosshair,
} from '@unovis/vue';

type SeriesNameHL = { name: string; hi: number; lo: number }[];

const props = withDefaults(
    defineProps<{
        data?: SeriesNameHL;
        title?: string;
    }>(),
    {
        data: () => [
            { name: 'foo', hi: 1, lo: 1 },
            { name: 'bar', hi: 2, lo: 1 },
            { name: 'biz', hi: 4, lo: 2 },
            { name: 'baz', hi: 8, lo: 4 },
        ],
    }
);

// For HL bars we need to show a bar from lo to hi. Unovis StackedBar
// stacks from 0, so we use a baseline approach: render a bar of
// height (hi - lo) with a y-offset equal to lo.
// We can do this with two stacked y-accessors:
//   y[0] = min(hi, lo)  (the invisible base)
//   y[1] = abs(hi - lo) (the visible bar)
// Then we make the base color transparent.

type ChartDatum = {
    x: number;
    base: number;
    span: number;
    hi: number;
    lo: number;
    name: string;
    isPositive: boolean;
};

const chartData = computed<ChartDatum[]>(() => {
    const raw = toRaw(props.data);
    return raw.map((d, i) => ({
        x: i,
        base: Math.min(d.hi, d.lo, 0),
        span: Math.abs(d.hi - d.lo),
        hi: d.hi,
        lo: d.lo,
        name: d.name,
        isPositive: d.hi >= d.lo,
    }));
});

// For HL bars, we need the bar to span from lo to hi.
// We achieve this by using the GroupedBar with a single bar per group,
// positioning via the y-domain and using the absolute values.
// Alternative: render as rects. But let's use StackedBar with a base.

// Actually, VisStackedBar stacks values. If we provide:
//   y[0] = min(hi, lo)  <- base segment
//   y[1] = |hi - lo|    <- visible segment
// The bar goes from 0 to min + span = max(hi,lo). But we want
// bars centered around 0 for negative values.

// Simpler approach: use two y values where the first is the offset
// from 0 to the bottom of the visible bar, and the second is the
// height. But StackedBar doesn't support transparent segments easily.

// Best approach for PoC: use the GroupedBar with custom y domain
// and render each bar as value = max(hi,lo), with color based on
// direction. The issue is we lose the lo->hi range visual.

// Let me use a different approach: render positive and negative
// components separately. For start-finish charts, hi=start, lo=finish,
// and the bar shows positions gained/lost.

// Actually, looking at the original: it renders a single rect per
// datum from lo to hi. The simplest Unovis equivalent is using
// VisGroupedBar with y = [d => d.hi] and yDomain starting from the
// minimum value. But that renders from 0.

// For true lo-hi bars, we need to set a baseline. Unovis doesn't
// have a built-in baseline prop on bars. Let's render this as two
// overlapping bars: a full bar to max(hi,lo) that's transparent,
// and the visible portion. Actually this is getting complex.

// Simplest PoC approach: render the net change (hi - lo) as a bar,
// which is what start-finish chart actually shows (positions gained).
// The original renders from lo to hi visually, but the key info
// is the direction and magnitude.

const barColor = (d: ChartDatum) => {
    return d.isPositive ? '#1aa179' : '#a1791a';
};

const xTickFormat = computed(() => {
    const data = chartData.value;
    const n = Math.max(1, Math.ceil(data.length / 20));
    return (tick: number) => {
        const i = Math.round(tick);
        if (i < 0 || i >= data.length) return '';
        return i % n === 0 ? data[i].name : '';
    };
});

function tooltipTemplate(d: ChartDatum): string {
    return `<div style="padding: 4px 8px; background: #1e1e2e; border: 1px solid #444; border-radius: 4px; color: #eee;">
        <strong>${d.name}</strong><br/>
        High: ${d.hi} | Low: ${d.lo}
    </div>`;
}
</script>

<template>
    <div>
        <div v-if="title" class="chart-title">{{ title }}</div>
        <VisXYContainer
            :data="chartData"
            :height="220"
            :xDomain="[-0.5, Math.max(chartData.length - 0.5, 0.5)]"
            :margin="{ top: 10, right: 10, bottom: 60, left: 50 }"
        >
            <VisStackedBar
                :x="(d: ChartDatum) => d.x"
                :y="[
                    (d: ChartDatum) => d.base,
                    (d: ChartDatum) => d.span,
                ]"
                :color="[
                    'transparent',
                    (d: ChartDatum) => d.isPositive ? '#1aa179' : '#a1791a',
                ]"
                :roundedCorners="2"
                :barMinHeight1Px="true"
            />

            <VisAxis
                type="x"
                :tickFormat="xTickFormat"
                :tickTextAngle="-35"
                :gridLine="false"
            />
            <VisAxis type="y" :gridLine="false" />

            <VisCrosshair :template="tooltipTemplate" />
            <VisTooltip />
        </VisXYContainer>
    </div>
</template>

<style scoped>
.chart-title {
    color: var(--gh-fg-default, #e6edf3);
    margin-bottom: 4px;
}
</style>
