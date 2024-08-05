<script setup lang="ts">
import {
    ref,
    onMounted,
    nextTick,
    computed,
    reactive,
    watchEffect,
    watch,
} from 'vue';

import { MurmurHashV2 } from '@@/src/utils/hash-util';

import type { SeriesXY } from '@@/src/models/vis/line-chart-model';
import * as d3 from 'd3';

export type PickNumericProps<T> = {
    [P in keyof T as T[P] extends number ? P : never]: T[P];
};

const aspectRatio = 0.5;

const props = defineProps<{
    data: SeriesXY[];
    title?: string;
    yRange?: [number, number];
}>();

const svgRoot = ref<SVGGElement | null>(null);
const divRoot = ref<HTMLElement | null>(null);
const startSize = 500;

onMounted(async () => {
    await nextTick();
    if (ResizeObserver && divRoot.value) {
        let resizeObserver = new ResizeObserver(() => {
            window.requestAnimationFrame(async () => {
                lineChartModel.value = await fetchModel();
            });
        });
        resizeObserver.observe(divRoot.value);
    }
});

async function fetchModel() {
    let height = startSize * aspectRatio;
    let width = startSize;

    if (svgRoot.value) {
        height = svgRoot.value.clientWidth * aspectRatio;
        width = svgRoot.value.clientWidth;
    }

    return await getLineChartModel(width, height, props.data, props.yRange);
}

async function getLineChartModel(
    width: number,
    height: number,
    data: SeriesXY[],
    yRange: [number, number] | undefined
) {
    let ret = getDefaultLineChartModel();

    ret.width = width;
    ret.height = height;

    ret.innerHeight = ret.height - ret.margin_top - ret.margin_bottom;
    ret.innerWidth = ret.width - ret.margin_left - ret.margin_right;

    if (data.length > 0) {
        let xScale = d3
            .scaleLinear()
            .domain(
                d3.extent(props.data[0].data, (d: any) => {
                    return d.x;
                })
            )
            .range([0, ret.innerWidth]);

        let maxY = d3.max(props.data, (sXY: SeriesXY) =>
            d3.max(sXY.data, (d: any) => d.y)
        );
        let minY = d3.min(props.data, (sXY: SeriesXY) =>
            d3.min(sXY.data, (d: any) => d.y)
        );

        let maxX = d3.max(props.data, (sXY: SeriesXY) =>
            d3.max(sXY.data, (d: any) => d.x)
        );
        let minX = d3.min(props.data, (sXY: SeriesXY) =>
            d3.min(sXY.data, (d: any) => d.x)
        );

        ret.xAxisInnerHtml = generateXAxisSvg(
            minX,
            maxX,
            ret.innerHeight,
            ret.innerWidth,
            xScale
        );

        if (yRange) {
            minY = yRange[0];
            maxY = yRange[1];
        }

        let yScale = d3
            .scaleLinear()
            .domain([minY, maxY])
            .range([ret.innerHeight, 0]);

        ret.yAxisInnerHtml = generateYAxisSvg(
            minY,
            maxY,
            ret.innerHeight,
            ret.innerWidth,
            yScale
        );

        ret.pathAttr = data.map((v) => getDPathAttr(v, xScale, yScale));
    }

    ret.toggleState.splice(
        0,
        ret.toggleState.length,
        ...props.data.map(() => true)
    );

    return ret;
}

function generateXAxisSvg(
    minX: number,
    maxX: number,
    innerHeight: number,
    innerWidth: number,
    scaleX: D3_Scale
) {
    const ticks = scaleX.ticks(5);
    const tickFormat = scaleX.tickFormat(5);

    const tickElements = ticks
        .map((tick: any) => {
            const x = scaleX(tick);
            return `
            <g class="tick" transform="translate(${x},0)">
                <line y2="6" stroke="white"></line>
                <text style="font-size: 16px;" fill="white" y="9" dy="0.71em">${tickFormat(
                    tick
                )}</text>
            </g>`;
        })
        .join('');

    const axisLine = `
        <path d="M0,6V0H${innerWidth}V6" fill="none" stroke="white"></path>
    `;

    // Wrap everything in the SVG element
    const g = `
            <g font-size="10" font-family="sans-serif" text-anchor="middle" transform="translate(0,${innerHeight})">
                ${axisLine}
                ${tickElements}
            </g>
    `;

    return g;
}

function generateYAxisSvg(
    minY: number,
    maxY: number,
    innerHeight: number,
    innerWidth: number,
    scaleY: D3_Scale
) {
    const ticks = scaleY.ticks(5);
    const tickFormat = scaleY.tickFormat(5);

    const tickElements = ticks
        .map((tick: any) => {
            const y = scaleY(tick);
            return `
              <g class="tick" transform="translate(0,${y})">
                <line x2="-6" stroke="white"></line>
                <text style="font-size: 16px;" fill="white" x="-9" dy="0.32em">${tickFormat(
                    tick
                )}</text>
            </g>`;
        })
        .join('');

    const axisLine = `
        <path d="M-6,0H0V${innerHeight}H-6" fill="none" stroke="white"></path>
    `;

    const g = `
            <g font-size="10" font-family="sans-serif" text-anchor="end">
                ${axisLine}
                ${tickElements}
            </g>
    `;

    return g;
}

function getDPathAttr(
    series: SeriesXY,
    scaleX: D3_Scale,
    scaleY: D3_Scale
): string {
    if (!scaleX || !scaleY) {
        return '';
    }

    const linePath = d3
        .line()
        .x(function (d: any) {
            return scaleX(d.x);
        })
        .y(function (d: any) {
            return scaleY(d.y);
        })(series.data);
    return linePath;
}

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

const basePatterns: string[] = [
    '',
    '16,2',
    '16,2,2,2',
    '16,8',
    '16,2,2,2,2,2',
    '4,4',
    '16,2,2,2,2,2,2,2',
    '8,2',
    '16,2,2,2,2,2,2,2,2,2,2,2',
    '32,2',
    '16,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2',
];

// const toggleState = reactive<boolean[]>([]);

function getColor(seriesIndex: number) {
    const baseColor = baseColors[seriesIndex % baseColors.length];
    const dColor = d3.color(baseColor);
    dColor.opacity = lineChartModel.value.toggleState[seriesIndex] ? 1 : 0.03;
    return dColor.formatRgb();
}
function onToggle(seriesIndex: number) {
    lineChartModel.value.toggleState[seriesIndex] =
        !lineChartModel.value.toggleState[seriesIndex];
}
function onToggleAll() {
    lineChartModel.value.toggleState.forEach(
        (ts: any, i: number) => (lineChartModel.value.toggleState[i] = !ts)
    );
}

const lineChartModel: Ref<LineChartModel> =
    await asyncDataWithReactiveModel<LineChartModel>(
        `LineChartModel-${[
            svgRoot.value ? svgRoot.value.clientWidth : startSize,
            (svgRoot.value ? svgRoot.value.clientWidth : startSize) *
                aspectRatio,
            MurmurHashV2(JSON.stringify(props.data), 123),
            MurmurHashV2(JSON.stringify(props.yRange), 123),
        ]
            .map((v) => v?.toString() || '')
            .join('-')}`,
        fetchModel,
        getDefaultLineChartModel,
        [
            () => props.data,
            () => props.title,
            () => props.yRange,
            () => divRoot?.value?.clientWidth,
        ]
    );

type D3_Scale = any | null;

interface LineChartModel {
    width: number;
    height: number;
    margin_right: number;
    margin_left: number;
    margin_top: number;
    margin_bottom: number;
    innerWidth: number;
    innerHeight: number;
    xAxisInnerHtml: string;
    yAxisInnerHtml: string;
    pathAttr: string[];
    toggleState: boolean[];
}

function getDefaultLineChartModel(): LineChartModel {
    return {
        width: 1000,
        height: 500,
        margin_right: 10,
        margin_left: 50,
        margin_top: 10,
        margin_bottom: 30,
        innerHeight: 500,
        innerWidth: 1000,
        xAxisInnerHtml: '<g></g>',
        yAxisInnerHtml: '<g></g>',
        pathAttr: [],
        toggleState: [],
    };
}
</script>

<template>
    <div>
        {{ title }}
    </div>
    <div ref="divRoot" style="overflow: hidden">
        <svg
            ref="svgRoot"
            v-bind:viewBox="`0 0 ${lineChartModel.width || 10} ${
                lineChartModel.height || 10
            }`"
        >
            <g
                :transform="`translate(${lineChartModel.margin_left || 0},${
                    lineChartModel.margin_top || 0
                })`"
            >
                <g v-html="lineChartModel.xAxisInnerHtml"></g>
                <g v-html="lineChartModel.yAxisInnerHtml"></g>
                <path
                    v-for="(path, i) in lineChartModel.pathAttr"
                    fill="none"
                    :stroke="getColor(i)"
                    :stroke-dasharray="basePatterns[i % basePatterns.length]"
                    stroke-width="1.5"
                    :d="path"
                ></path>
            </g>
        </svg>
    </div>
    <div class="d-flex flex-wrap justify-content-center d-print-none">
        <button class="btn bg-dark text-white" @click="onToggleAll">
            Toggle All
        </button>
    </div>
    <div class="d-flex flex-wrap justify-content-center d-print-none">
        <div v-for="(series, i) in props.data" class="p-1">
            <button class="btn bg-dark text-white" @click="onToggle(i)">
                <span
                    class="d-inline-block"
                    :style="`background-color:${getColor(
                        i
                    )}; width:10px; height:10px`"
                ></span>
                {{ series.name }}
            </button>
        </div>
    </div>
</template>
<style scoped>
.w-100 {
    width: 100%;
}

.p-1 {
    padding: 0.25rem;
}

.d-flex {
    display: flex;
}

.d-inline-block {
    display: inline-block;
}

.flex-wrap {
    flex-wrap: wrap;
}

.justify-content-center {
    justify-content: center;
}

.bg-dark {
    background-color: #212529;
}

.text-white {
    color: white;
}
</style>
