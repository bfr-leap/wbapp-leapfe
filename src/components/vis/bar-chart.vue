<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import type { BarChartDatum } from '@@/src/models/vis/bar-chart-model';
import { MurmurHashV2 } from '@@/src/utils/hash-util';
import * as d3 from 'd3';

const aspectRatio = 0.37;

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

const svgRoot = ref<SVGGElement | null>(null);
const divRoot = ref<HTMLElement | null>(null);

onMounted(async () => {
    await nextTick();
    if (ResizeObserver && divRoot.value) {
        let resizeObserver = new ResizeObserver(() => {
            window.requestAnimationFrame(async () => {
                barChartModel.value = await fetchModel();
            });
        });
        resizeObserver.observe(divRoot.value);
    }
});

const minBarHeight = ref<number>(0.02);
const startSize = 500;

async function fetchModel(): Promise<BarChartModel> {
    let height = startSize * aspectRatio;
    let width = startSize;

    if (svgRoot.value) {
        height = svgRoot.value.clientWidth * aspectRatio;
        width = svgRoot.value.clientWidth;
    }

    return getBarChartModel(width, height, props.data);
}

function getBarChartModel(
    width: number,
    height: number,
    data: BarChartDatum[]
): BarChartModel {
    let ret = getDefaultBarChartModel();

    data = JSON.parse(JSON.stringify(data));

    ret.height = height;
    ret.width = width;
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
    let minBarHeight = Math.max(...data.map((d) => d.value)) / 100;

    let scaleY = d3
        .scaleLinear()
        .domain([
            0,
            Math.max(minBarHeight, Math.max(...data.map((d) => d.value))),
        ])
        .range([ret.innerHeight, 0]);

    ret.xAxisHtml = generateXAxisSvg(ret.innerHeight, ret.innerWidth, scaleX);
    ret.yAxisHtml = generateYAxisSvg(ret.innerHeight, ret.innerWidth, scaleY);

    let average =
        data.length > 0
            ? data.map((v) => v.value).reduce((p, c) => p + c) / data.length
            : 1;

    let stdev = data.length
        ? Math.sqrt(
              data
                  .map((v) => (v.value - average) * (v.value - average))
                  .reduce((p, c) => p + c) / data.length
          )
        : 1;

    ret.statLines.push(
        `<path transform="translate(0,${scaleY(average)})" d="M0,0H${
            ret.innerWidth
        }" fill="none" stroke="#aaaaff44"></path>`
    );
    ret.statLines.push(
        `<path transform="translate(0,${scaleY(average + stdev)})" d="M0,0H${
            ret.innerWidth
        }" fill="none" stroke="#aaaaaa55"></path>`
    );
    ret.statLines.push(
        `<path transform="translate(0,${scaleY(average - stdev)})" d="M0,0H${
            ret.innerWidth
        }" fill="none" stroke="#aaaaaa55"></path>`
    );

    const bandwidth = scaleX.bandwidth();

    ret.rects = data.map((v) => {
        return {
            x: scaleX(v.name),
            y: scaleY((v.value + 0) / 2 + Math.abs((v.value - 0) / 2)),
            width: bandwidth,
            height: Math.max(
                Math.abs(scaleY(v.value) - scaleY(0)),
                minBarHeight
            ),
            isVal2: false,
        };
    });

    ret.rects = ret.rects.concat(
        data.map((v) => {
            let v2 = v.value2 || 0;

            return {
                x: scaleX(v.name),
                y: scaleY((v2 + 0) / 2 + Math.abs((v2 - 0) / 2)),
                width: bandwidth,
                height: Math.max(
                    Math.abs(scaleY(v2) - scaleY(0)),
                    minBarHeight
                ),
                isVal2: true,
            };
        })
    );

    return ret;
}

type D3_BandScale = d3.ScaleBand<string>;
type D3_LinearScale = d3.ScaleLinear<number, number>;

function generateXAxisSvg(
    innerHeight: number,
    innerWidth: number,
    scaleX: D3_BandScale
) {
    const ticks = scaleX.domain();
    const bandwidth = scaleX.bandwidth() / 2;

    const tickElements = ticks
        .map((tick: string) => {
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
    scaleY: D3_LinearScale
) {
    const ticks = scaleY.ticks(5);
    const tickFormat = scaleY.tickFormat(5);

    const tickElements = ticks
        .map((tick: number) => {
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

const barChartModel: Ref<BarChartModel> =
    await asyncDataWithReactiveModel<BarChartModel>(
        `BarChartModel-${[
            svgRoot.value ? svgRoot.value.clientWidth : startSize,
            (svgRoot.value ? svgRoot.value.clientWidth : startSize) *
                aspectRatio,
            MurmurHashV2(JSON.stringify(props.data), 123),
        ]
            .map((v) => v.toString())
            .join('-')}`,
        fetchModel,
        getDefaultBarChartModel,
        [() => props.data, () => props.title, () => divRoot?.value?.clientWidth]
    );

function getDefaultBarChartModel(): BarChartModel {
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
        statLines: [],
    };
}

interface BarRect {
    x: number;
    y: number;
    width: number;
    height: number;
    isVal2: boolean;
}

interface BarChartModel {
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
    statLines: string[];
}
</script>

<template>
    <div>
        <div>
            {{ props.title }}
        </div>
        <div ref="divRoot">
            <svg
                ref="svgRoot"
                class="w-100"
                :height="barChartModel.height"
                v-bind:viewBox="`0 0 ${barChartModel.width} ${barChartModel.height}`"
            >
                <g
                    :transform="`translate(${barChartModel.margin_left},${barChartModel.margin_top})`"
                >
                    <g v-html="barChartModel.xAxisHtml"></g>
                    <g v-html="barChartModel.yAxisHtml"></g>
                    <rect
                        v-for="rec in barChartModel.rects"
                        :x="rec.x"
                        :y="rec.y"
                        :width="rec.width"
                        :height="rec.height"
                        :style="`fill: ${rec.isVal2 ? '#1a79a1' : '#1aa179'}`"
                    ></rect>
                    <g
                        v-for="statLine of barChartModel.statLines"
                        v-html="statLine"
                    ></g>
                </g>
            </svg>
        </div>
    </div>
</template>
