<script setup lang="ts">
import {
    computed,
    ref,
    toRaw,
    onMounted,
    onUnmounted,
    nextTick,
} from 'vue';
import type { SeriesXY } from '@@/src/models/vis/line-chart-model';
import {
    VisXYContainer,
    VisLine,
    VisAxis,
    VisTooltip,
    VisCrosshair,
} from '@unovis/vue';
import { CurveType } from '@unovis/ts';

const containerRef = ref<HTMLElement | null>(null);
const containerWidth = ref(500);
let resizeObserver: ResizeObserver | null = null;

onMounted(async () => {
    await nextTick();
    if (containerRef.value) {
        containerWidth.value = containerRef.value.clientWidth;
        resizeObserver = new ResizeObserver(() => {
            if (containerRef.value) {
                containerWidth.value = containerRef.value.clientWidth;
            }
        });
        resizeObserver.observe(containerRef.value);
    }
});

onUnmounted(() => {
    resizeObserver?.disconnect();
});

const props = defineProps<{
    data: SeriesXY[];
    title?: string;
    yRange?: [number, number];
}>();

const isNarrow = computed(() => containerWidth.value < 576);

const chartMargin = computed(() => ({
    top: 10,
    right: 10,
    bottom: isNarrow.value ? 20 : 30,
    left: isNarrow.value ? 35 : 50,
}));

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

// Build y-accessor array — always return the data value (never null
// for toggle). Toggling only changes color opacity so the line fades
// instead of disappearing, matching the original D3 behavior.
const yAccessors = computed(() => {
    return props.data.map((_, i) => {
        return (d: FlatDatum) => d[`y${i}`] ?? undefined;
    });
});

// Build defined-accessor array — tells Unovis where each series has
// actual data points so lines end properly when a driver drops out
// instead of connecting through 0.
const definedAccessors = computed(() => {
    return props.data.map((_, i) => {
        return (d: FlatDatum) =>
            d[`y${i}`] !== null && d[`y${i}`] !== undefined;
    });
});

// Toggle changes color opacity (0.03 when off) instead of hiding data
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

function onToggle(seriesIndex: number) {
    toggleState.value[seriesIndex] = !toggleState.value[seriesIndex];
}

function onToggleAll() {
    toggleState.value = toggleState.value.map((v) => !v);
}
</script>

<template>
    <div>
        <div v-if="title" class="chart-title">{{ title }}</div>
        <div
            ref="containerRef"
            class="chart-container"
            :class="{ narrow: isNarrow }"
        >
            <VisXYContainer
                :data="flatData"
                :yDomain="yDomain"
                :margin="chartMargin"
                :height="'100%'"
            >
                <VisLine
                    v-for="(accessor, i) in yAccessors"
                    :key="i"
                    :x="(d: FlatDatum) => d.x"
                    :y="accessor"
                    :defined="definedAccessors[i]"
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

.chart-container {
    width: 100%;
    aspect-ratio: 1 / 0.5;
}

.chart-container :deep(.unovis-xy-container) {
    width: 100% !important;
    height: 100% !important;
}

.chart-container.narrow :deep(text) {
    font-size: 10px !important;
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

@media (max-width: 576px) {
    .toggle-btn {
        font-size: 0.75rem;
        padding: 2px 5px;
    }

    .legend-item {
        padding: 0.125rem;
    }

    .color-swatch {
        width: 8px;
        height: 8px;
    }
}
</style>
