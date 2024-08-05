<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { MurmurHashV2 } from '@@/src/utils/hash-util';
import * as d3 from 'd3';

const aspectRatio = 0.37;

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

const svgRoot = ref<SVGGElement | null>(null);
const divRoot = ref<HTMLElement | null>(null);
const startSize = 500;

onMounted(async () => {
    await nextTick();
    if (ResizeObserver && divRoot.value) {
        let resizeObserver = new ResizeObserver(() => {
            window.requestAnimationFrame(async () => {
                hlBarChartModel.value = await fetchModel();
            });
        });
        resizeObserver.observe(divRoot.value);
    }
});

async function fetchModel(): Promise<HLBarChartModel> {
    let height = startSize * aspectRatio;
    let width = startSize;

    if (svgRoot.value) {
        height = svgRoot.value.clientWidth * aspectRatio;
        width = svgRoot.value.clientWidth;
    }

    return gettHLBarChartModel(width, height, props.data);
}

function gettHLBarChartModel(
    width: number,
    height: number,
    data: SeriesNameHL
): HLBarChartModel {
    let ret = getDefaultHLBarChartModel();

    data = JSON.parse(JSON.stringify(data));
    ret.width = width;
    ret.height = height;
    ret.innerHeight = ret.height - ret.margin_top - ret.margin_bottom;
    ret.innerWidth = ret.width - ret.margin_left - ret.margin_right;

    const dataLength = data.length;
    const n = 0.04 * width;
    let nextB = ' ';

    const xTicks = data.map((d, i) => {
        const mod = Math.ceil(dataLength / n);
        const r = i % mod === 0 ? d.name : (nextB += ' ');
        data[i].name = r;
        return r;
    });

    let scaleX = d3
        .scaleBand()
        .padding(0.1)
        .domain(xTicks)
        .range([0, ret.innerWidth]);

    let scaleY = d3
        .scaleLinear()
        .domain([
            Math.min(Math.min(...data.map((d) => Math.min(d.hi, d.lo))), 0),
            Math.max(Math.max(...data.map((d) => Math.max(d.hi, d.lo))), 0),
        ])
        .range([ret.innerHeight, 0]);

    ret.xAxisHtml = generateXAxisSvg(ret.innerHeight, ret.innerWidth, scaleX);
    ret.yAxisHtml = generateYAxisSvg(ret.innerHeight, ret.innerWidth, scaleY);

    let minBarHeight = 1;

    const bandwidth = scaleX.bandwidth();

    ret.rects = data.map((v) => {
        return {
            x: scaleX(v.name),
            y: scaleY((v.hi + v.lo) / 2 + Math.abs((v.hi - v.lo) / 2)),
            width: bandwidth,
            height: Math.max(
                Math.abs(scaleY(v.hi) - scaleY(v.lo)),
                minBarHeight
            ),
            hi: v.hi,
            lo: v.lo,
        };
    });

    return ret;
}

type D3_Scale = any | null;

function generateXAxisSvg(
    innerHeight: number,
    innerWidth: number,
    scaleX: D3_Scale
) {
    const ticks = scaleX.domain();
    const bandwidth = scaleX.bandwidth() / 2;

    const tickElements = ticks
        .map((tick: any) => {
            const x = scaleX(tick)!;

            return `
            <g class="tick" transform="translate(${x + bandwidth},0)">
                <line y2="6" stroke="white"></line>
                <text dx="-.8em" style="font-size: 12px; text-anchor: end" fill="white" y="9" dy="0.15em" transform="rotate(-35)">${tick}</text>
            </g>`;
        })
        .join('');

    const axisLine = `
        <path d="M0,6V0H${innerWidth}V6" fill="none" stroke="white"></path>
    `;

    const g = `
            <g transform="translate(0,${innerHeight})" fill="none" font-size="10" font-family="sans-serif" text-anchor="middle">
                ${axisLine}
                ${tickElements}
            </g>
    `;

    return g;
}

function generateYAxisSvg(
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

interface BarRect {
    x: number;
    y: number;
    width: number;
    height: number;
    hi: number;
    lo: number;
}

function getDefaultHLBarChartModel(): HLBarChartModel {
    return {
        width: 1000,
        height: 500,
        margin_left: 50,
        margin_right: 10,
        margin_top: 10,
        margin_bottom: 50,
        innerHeight: 440,
        innerWidth: 940,
        rects: [],
        xAxisHtml: '',
        yAxisHtml: '',
    };
}

interface HLBarChartModel {
    width: number;
    height: number;
    margin_left: number;
    margin_right: number;
    margin_top: number;
    margin_bottom: number;
    innerHeight: number;
    innerWidth: number;
    rects: BarRect[];
    xAxisHtml: string;
    yAxisHtml: string;
}

const hlBarChartModel: Ref<HLBarChartModel> =
    await asyncDataWithReactiveModel<HLBarChartModel>(
        `HLBarChartModel-${[
            svgRoot.value ? svgRoot.value.clientWidth : startSize,
            (svgRoot.value ? svgRoot.value.clientWidth : startSize) *
                aspectRatio,
            MurmurHashV2(JSON.stringify(props.data), 123),
        ]
            .map((v) => v.toString())
            .join('-')}`,
        fetchModel,
        getDefaultHLBarChartModel,
        [() => props.data, () => props.title, () => divRoot?.value?.clientWidth]
    );
</script>

<template>
    <div>
        <div>
            {{ title }}
        </div>
        <div ref="divRoot">
            <svg
                ref="svgRoot"
                class="w-100"
                :height="hlBarChartModel.height"
                v-bind:viewBox="`0 0 ${hlBarChartModel.width} ${hlBarChartModel.height}`"
            >
                <g
                    :transform="`translate(${hlBarChartModel.margin_left},${hlBarChartModel.margin_top})`"
                >
                    <g v-html="hlBarChartModel.xAxisHtml"></g>
                    <g v-html="hlBarChartModel.yAxisHtml"></g>
                    <rect
                        v-for="rec in hlBarChartModel.rects"
                        :x="rec.x"
                        :y="rec.y"
                        :width="rec.width"
                        :height="rec.height"
                        :style="`fill: ${
                            rec.hi >= rec.lo ? '#1aa179' : '#a1791a'
                        }`"
                    ></rect>
                </g>
            </svg>
        </div>
    </div>
</template>
