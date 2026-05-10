<script setup lang="ts">
import { computed, ref, toRaw, onMounted, onUnmounted, nextTick } from 'vue';
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

// Y-axis labels live on the right (Bloomberg / Apple Stocks
// pattern). The right margin reserves space for them; the left
// is just a small gutter so the leftmost data point isn't
// clipped against the section edge.
const chartMargin = computed(() => ({
    top: 8,
    right: isNarrow.value ? 24 : 36,
    bottom: isNarrow.value ? 20 : 28,
    left: isNarrow.value ? 4 : 8,
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

// Series names typically arrive pre-formatted as "P1 - Elliot Rolls".
// Split into position prefix + driver name so the chip can show
// just the position on phones and the full label on wider screens.
const parsedSeries = computed(() =>
    props.data.map((s) => {
        const idx = s.name.indexOf(' - ');
        if (idx < 0) return { pos: s.name, name: '' };
        return {
            pos: s.name.slice(0, idx),
            name: s.name.slice(idx + 3),
        };
    })
);
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
                <VisAxis
                    type="y"
                    position="right"
                    :gridLine="false"
                    :numTicks="5"
                />
            </VisXYContainer>
        </div>
        <div class="legend-toolbar d-print-none">
            <button
                type="button"
                class="button button--ghost button--sm"
                @click="onToggleAll"
            >
                Toggle All
            </button>
        </div>
        <div class="legend-area d-print-none">
            <button
                v-for="(series, i) in props.data"
                :key="i"
                type="button"
                class="legend-chip"
                :class="{ 'legend-chip--off': !toggleState[i] }"
                v-bind:title="series.name"
                @click="onToggle(i)"
            >
                <span
                    class="legend-chip__dot"
                    :style="{
                        backgroundColor: baseColors[i % baseColors.length],
                    }"
                ></span>
                <span class="legend-chip__pos">{{ parsedSeries[i].pos }}</span>
                <span
                    v-if="parsedSeries[i].name"
                    class="legend-chip__name d-none d-sm-inline"
                    >{{ parsedSeries[i].name }}</span
                >
            </button>
        </div>
    </div>
</template>

<style scoped>
.chart-title {
    color: var(--text-primary);
    font-size: var(--text-sm);
    font-weight: 600;
    margin-bottom: var(--space-2);
}

.chart-container {
    width: 100%;
    height: 240px;
    display: block;
    margin: 0;
    padding: 0;
}
@media (min-width: 768px) {
    .chart-container {
        height: 320px;
    }
}

/* Force every unovis-prefixed wrapper, plus the SVG itself, to
   fill the chart-container and carry no padding/margin. The
   gap on the left of the chart was coming from somewhere inside
   this hierarchy that the more targeted :deep selectors above
   weren't catching. */
.chart-container :deep([class^='unovis-']),
.chart-container :deep([class*=' unovis-']) {
    padding: 0 !important;
    margin: 0 !important;
}
.chart-container :deep(.unovis-xy-container) {
    width: 100% !important;
    height: 100% !important;
}
.chart-container :deep(svg) {
    width: 100% !important;
    height: 100% !important;
    display: block;
    overflow: visible;
}

/* Mono, tabular, recessed axis labels — they are reference, not
   data. Default unovis labels are sans and slightly too bright. */
.chart-container :deep(.unovis-axis text),
.chart-container :deep(text.tick-label) {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    fill: var(--text-muted);
}
.chart-container.narrow :deep(text) {
    font-size: 10px !important;
}

.legend-toolbar {
    display: flex;
    justify-content: center;
    margin-top: var(--space-3);
}

.legend-area {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--space-1);
    margin-top: var(--space-2);
}

.legend-chip {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: 2px var(--space-2);
    background: transparent;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-family: inherit;
    font-size: var(--text-xs);
    line-height: 1.4;
    cursor: pointer;
    transition: background-color var(--duration-fast) var(--easing-out),
        border-color var(--duration-fast) var(--easing-out),
        color var(--duration-fast) var(--easing-out),
        opacity var(--duration-fast) var(--easing-out);
}
.legend-chip:hover {
    background: var(--surface-2);
    border-color: var(--border-strong);
}
.legend-chip--off {
    color: var(--text-muted);
    opacity: 0.6;
}

.legend-chip__dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
    transition: opacity var(--duration-fast) var(--easing-out);
}
.legend-chip--off .legend-chip__dot {
    opacity: 0.35;
}

.legend-chip__pos {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    color: var(--text-secondary);
}
.legend-chip__name {
    font-variant-numeric: tabular-nums;
}

@media (max-width: 576px) {
    .legend-area {
        gap: 4px;
    }
    .legend-chip {
        font-size: 0.6875rem;
        padding: 2px 6px;
        min-width: 2.5rem;
    }
}
</style>
