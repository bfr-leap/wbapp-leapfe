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

// Unovis StackedBar splits positive/negative into separate stacks,
// so we can't directly render floating bars from lo to hi when values
// cross zero. Fix: offset all values so they're positive, then
// adjust Y-axis labels to show the original values.

type ChartDatum = {
    x: number;
    base: number;
    span: number;
    hi: number;
    lo: number;
    name: string;
    isPositive: boolean;
};

const globalMin = computed(() => {
    const allVals = props.data.flatMap((d) => [d.hi, d.lo]);
    return Math.min(...allVals, 0);
});

const offset = computed(() => -globalMin.value);

const chartData = computed<ChartDatum[]>(() => {
    const raw = toRaw(props.data);
    const off = offset.value;
    return raw.map((d, i) => ({
        x: i,
        base: Math.min(d.hi, d.lo) + off,
        span: Math.abs(d.hi - d.lo),
        hi: d.hi,
        lo: d.lo,
        name: d.name,
        isPositive: d.hi >= d.lo,
    }));
});

const xTickFormat = computed(() => {
    const data = chartData.value;
    const n = Math.max(1, Math.ceil(data.length / 20));
    return (tick: number) => {
        const i = Math.round(tick);
        if (i < 0 || i >= data.length) return '';
        return i % n === 0 ? data[i].name : '';
    };
});

const yTickFormat = computed(() => {
    const off = offset.value;
    return (v: number) => String(Math.round(v - off));
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
        <div class="chart-aspect-bar">
            <VisXYContainer
                :data="chartData"
                :xDomain="[-0.5, Math.max(chartData.length - 0.5, 0.5)]"
                :yDomain="[0, undefined]"
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
                        (d: ChartDatum) =>
                            d.isPositive ? '#1aa179' : '#a1791a',
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
                <VisAxis type="y" :gridLine="false" :tickFormat="yTickFormat" />

                <VisCrosshair :template="tooltipTemplate" />
                <VisTooltip />
            </VisXYContainer>
        </div>
    </div>
</template>

<style scoped>
.chart-title {
    color: var(--gh-fg-default, #e6edf3);
    margin-bottom: 4px;
}

.chart-aspect-bar {
    aspect-ratio: 1 / 0.37;
    width: 100%;
}
</style>
