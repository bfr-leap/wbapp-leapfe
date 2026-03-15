<script setup lang="ts">
import { computed, ref, toRaw } from 'vue';
import type { SeriesXY } from '@@/src/models/vis/line-chart-model';
import {
    VisXYContainer,
    VisLine,
    VisAxis,
    VisTooltip,
    VisCrosshair,
    VisBulletLegend,
} from '@unovis/vue';
import { CurveType } from '@unovis/ts';

const props = defineProps<{
    data: SeriesXY[];
    title?: string;
    yRange?: [number, number];
}>();

// Unovis expects a flat data array with one entry per x-value, where
// each series' y-value is a separate field. We pivot the series-based
// format into this structure.

type FlatDatum = {
    x: number;
    [key: `y${number}`]: number | null;
};

const baseColors: string[] = [
    '#ffadad',
    '#ffd6a5',
    '#fdffb6',
    '#caffbf',
    '#9bf6ff',
    '#a0c4ff',
    '#bdb2ff',
    '#ffc6ff',
    '#e27674',
    '#e3af6d',
    '#dde07c',
    '#94df84',
    '#65d5e2',
    '#6a95e1',
    '#8a79df',
    '#df8bdc',
    '#cf3619',
    '#cf9616',
    '#b3cf1e',
    '#2ccf22',
    '#14a0cc',
    '#163fcc',
    '#531dcc',
    '#d027b3',
];

const basePatterns: number[][] = [
    [],
    [16, 2],
    [16, 2, 2, 2],
    [16, 8],
    [16, 2, 2, 2, 2, 2],
    [4, 4],
    [16, 2, 2, 2, 2, 2, 2, 2],
    [8, 2],
    [16, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    [32, 2],
    [16, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
];

const toggleState = ref<boolean[]>([]);

// Pivot series data into flat array keyed by x-value
const flatData = computed<FlatDatum[]>(() => {
    const raw = toRaw(props.data);
    if (!raw || raw.length === 0) return [];

    // Ensure toggleState is sized correctly
    while (toggleState.value.length < raw.length) {
        toggleState.value.push(true);
    }
    if (toggleState.value.length > raw.length) {
        toggleState.value.splice(raw.length);
    }

    // Collect all x-values across all series
    const xMap = new Map<number, FlatDatum>();
    raw.forEach((series, si) => {
        series.data.forEach((pt) => {
            if (!xMap.has(pt.x)) {
                const datum: FlatDatum = { x: pt.x };
                // Initialize all series y-values as null
                for (let j = 0; j < raw.length; j++) {
                    datum[`y${j}`] = null;
                }
                xMap.set(pt.x, datum);
            }
            xMap.get(pt.x)![`y${si}`] = pt.y;
        });
    });

    // Sort by x
    return Array.from(xMap.values()).sort((a, b) => a.x - b.x);
});

// Build y-accessor array — one per series, returning null when toggled off
const yAccessors = computed(() => {
    return props.data.map((_, i) => {
        return (d: FlatDatum) => {
            if (!toggleState.value[i]) return null;
            return d[`y${i}`] ?? null;
        };
    });
});

const lineColors = computed(() => {
    return props.data.map((_, i) => {
        const base = baseColors[i % baseColors.length];
        return toggleState.value[i] ? base : `${base}08`;
    });
});

const lineDashArrays = computed(() => {
    return props.data.map((_, i) => basePatterns[i % basePatterns.length]);
});

const yDomain = computed<[number | undefined, number | undefined]>(() => {
    if (props.yRange) {
        return [props.yRange[0], props.yRange[1]];
    }
    return [undefined, undefined];
});

const legendItems = computed(() => {
    return props.data.map((s, i) => ({
        name: s.name,
        color: baseColors[i % baseColors.length],
        inactive: !toggleState.value[i],
    }));
});

function onToggle(seriesIndex: number) {
    toggleState.value[seriesIndex] = !toggleState.value[seriesIndex];
}

function onToggleAll() {
    toggleState.value = toggleState.value.map((v) => !v);
}

function onLegendItemClick(_: unknown, i: number) {
    onToggle(i);
}
</script>

<template>
    <div>
        <div v-if="title" class="chart-title">{{ title }}</div>
        <div class="chart-aspect-line">
            <VisXYContainer
                :data="flatData"
                :yDomain="yDomain"
                :margin="{ top: 10, right: 10, bottom: 30, left: 50 }"
            >
                <VisLine
                    v-for="(accessor, i) in yAccessors"
                    :key="i"
                    :x="(d: FlatDatum) => d.x"
                    :y="accessor"
                    :color="lineColors[i]"
                    :lineWidth="1.5"
                    :lineDashArray="lineDashArrays[i]"
                    :curveType="CurveType.Linear"
                />

                <VisAxis type="x" :gridLine="false" :numTicks="5" />
                <VisAxis type="y" :gridLine="false" :numTicks="5" />
            </VisXYContainer>
        </div>
        <div class="legend-area d-print-none">
            <button class="toggle-btn" @click="onToggleAll">Toggle All</button>
        </div>
        <div class="legend-area d-print-none">
            <div v-for="(series, i) in props.data" :key="i" class="legend-item">
                <button class="toggle-btn" @click="onToggle(i)">
                    <span
                        class="color-swatch"
                        :style="{
                            backgroundColor: toggleState[i]
                                ? baseColors[i % baseColors.length]
                                : baseColors[i % baseColors.length] + '08',
                        }"
                    ></span>
                    {{ series.name }}
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.chart-title {
    color: var(--gh-fg-default, #e6edf3);
    margin-bottom: 4px;
}

.chart-aspect-line {
    aspect-ratio: 1 / 0.5;
    width: 100%;
}

.legend-area {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
}

.legend-item {
    padding: 0.25rem;
}

.toggle-btn {
    background-color: var(--gh-canvas-subtle, #161b22);
    color: var(--gh-fg-default, #e6edf3);
    border: none;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
}

.toggle-btn:hover {
    opacity: 0.8;
}

.color-swatch {
    display: inline-block;
    width: 10px;
    height: 10px;
}
</style>
