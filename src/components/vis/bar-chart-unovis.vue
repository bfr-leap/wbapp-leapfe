<script setup lang="ts">
import { computed, toRaw } from 'vue';
import type { BarChartDatum } from '@@/src/models/vis/bar-chart-model';
import {
    VisXYContainer,
    VisGroupedBar,
    VisAxis,
    VisPlotline,
    VisPlotband,
    VisTooltip,
    VisCrosshair,
} from '@unovis/vue';
import { GroupedBar, Axis, Crosshair } from '@unovis/ts';

const props = withDefaults(
    defineProps<{
        data?: BarChartDatum[];
        title?: string;
    }>(),
    {
        data: () => [
            { name: 'foo', value: 0.3 },
            { name: 'bar', value: 0.13 },
            { name: 'biz', value: 0.03 },
            { name: 'baz', value: 0.53 },
        ],
    }
);

type ChartDatum = {
    x: number;
    y1: number;
    y2: number;
    name: string;
};

const chartData = computed<ChartDatum[]>(() => {
    const raw = toRaw(props.data);
    return raw.map((d, i) => ({
        x: i,
        y1: d.value,
        y2: d.value2 ?? 0,
        name: d.name,
    }));
});

const hasValue2 = computed(() => {
    return props.data.some((d) => d.value2 !== undefined && d.value2 !== 0);
});

const yAccessors = computed(() => {
    if (hasValue2.value) {
        return [(d: ChartDatum) => d.y1, (d: ChartDatum) => d.y2];
    }
    return [(d: ChartDatum) => d.y1];
});

const barColors = computed(() => {
    if (hasValue2.value) {
        return ['#1aa179', '#1a79a1'];
    }
    return ['#1aa179'];
});

const average = computed(() => {
    const vals = props.data.map((d) => d.value);
    if (vals.length === 0) return 0;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
});

const stdev = computed(() => {
    const vals = props.data.map((d) => d.value);
    if (vals.length === 0) return 0;
    const avg = average.value;
    const variance =
        vals.reduce((sum, v) => sum + (v - avg) * (v - avg), 0) / vals.length;
    return Math.sqrt(variance);
});

const xTickValues = computed(() => chartData.value.map((_, i) => i));

const xTickFormat = computed(() => {
    const data = chartData.value;
    return (tick: number) => {
        const i = Math.round(tick);
        if (i < 0 || i >= data.length) return '';
        return data[i].name;
    };
});

function tooltipTemplate(d: ChartDatum): string {
    let html = `<div style="padding: 4px 8px; background: #1e1e2e; border: 1px solid #444; border-radius: 4px; color: #eee;">`;
    html += `<strong>${d.name}</strong><br/>`;
    html += `Value: ${d.y1.toFixed(3)}`;
    if (hasValue2.value && d.y2 !== 0) {
        html += `<br/>Value 2: ${d.y2.toFixed(3)}`;
    }
    html += `</div>`;
    return html;
}
</script>

<template>
    <div>
        <div v-if="title" class="chart-title">{{ title }}</div>
        <div class="chart-container">
            <VisXYContainer
                :data="chartData"
                :xDomain="[-0.5, Math.max(chartData.length - 0.5, 0.5)]"
                :yDomain="[0, undefined]"
                :margin="{ top: 10, right: 10, bottom: 80, left: 50 }"
            >
                <VisGroupedBar
                    :x="(d: ChartDatum) => d.x"
                    :y="yAccessors"
                    :color="barColors"
                    :roundedCorners="2"
                    :barMinHeight="1"
                    :groupPadding="0.1"
                />

                <!-- Mean line -->
                <VisPlotline
                    :value="average"
                    color="rgba(170, 170, 255, 0.27)"
                    :lineWidth="1"
                />

                <!-- Stdev band (mean ± 1 stdev) -->
                <VisPlotband
                    :from="average - stdev"
                    :to="average + stdev"
                    color="rgba(170, 170, 170, 0.08)"
                />

                <VisAxis
                    type="x"
                    :tickValues="xTickValues"
                    :numTicks="chartData.length"
                    :tickFormat="xTickFormat"
                    :tickTextAngle="-35"
                    :tickTextWidth="120"
                    tickTextFitMode="trim"
                    :gridLine="false"
                />
                <VisAxis type="y" :gridLine="false" />

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

.chart-container {
    width: 100%;
    aspect-ratio: 1 / 0.5;
}

.chart-container :deep(.unovis-xy-container) {
    width: 100% !important;
    height: 100% !important;
}
</style>
