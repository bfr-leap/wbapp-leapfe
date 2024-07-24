<script setup lang="ts">
import { ref, onMounted, nextTick, computed, watch } from 'vue';
import type { BarChartDatum } from '@/models/vis/bar-chart-model';

const d3: any = (<any>globalThis).d3;
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
const xAxis = ref<SVGGElement | null>(null);
const yAxis = ref<SVGGElement | null>(null);
const height = ref(100);
const width = ref(100);
const renderData = ref<BarChartDatum[]>([]);

const margin = { top: 10, right: 10, bottom: 50, left: 50 };
const innerHeight = computed(() => {
    return height.value - margin.top - margin.bottom;
});
const innerWidth = computed(() => {
    return width.value - margin.left - margin.right;
});

onMounted(async () => {
    await nextTick();
    if (ResizeObserver && divRoot.value) {
        let resizeObserver = new ResizeObserver(() => {
            window.requestAnimationFrame(redrawAxis);
        });
        resizeObserver.observe(divRoot.value);
    }
});

let scaleX = ref();
let scaleY = ref();

const minBarHeight = ref<number>(0.02);

watch(() => props.data, redrawAxis); // reset the d3 avg axis when the data changes.
function redrawAxis() {
    const data: { name: string; value: number }[] = JSON.parse(
        JSON.stringify(props.data)
    );
    renderData.value = data;

    if (svgRoot.value /*&& props.data.length > 0*/) {
        height.value = svgRoot.value.clientWidth * aspectRatio;
        width.value = svgRoot.value.clientWidth;

        const dataLength = data.length;
        const n = 0.04 * width.value;
        let nextB = ' ';

        const xTicks = data.map((d, i) => {
            const mod = Math.ceil(dataLength / n);
            const r = i % mod === 0 ? d.name : (nextB += ' ');
            data[i].name = r;
            return r;
        });

        // add x axis
        const xAxisSelection = d3.select(xAxis.value);
        xAxisSelection.html(''); // clears the  inner nodes
        scaleX.value = d3
            .scaleBand()
            .padding(0.1)
            .domain(xTicks)
            .range([0, innerWidth.value]);
        const axisX = d3.axisBottom(scaleX.value);
        axisX(xAxisSelection);
        xAxisSelection
            .selectAll(['line', 'path', 'text'])
            .style('font-size', 12)
            .style('stroke', 'white');
        xAxisSelection
            .selectAll('text')
            .style('text-anchor', 'end')
            .attr('dx', '-.8em')
            .attr('dy', '.15em')
            .attr('transform', 'rotate(-35)');

        // add y axis
        const yAxisSelection = d3.select(yAxis.value);
        yAxisSelection.html('');
        minBarHeight.value = Math.max(...data.map((d) => d.value)) / 100;
        scaleY.value = d3
            .scaleLinear()
            .domain([
                0,
                Math.max(
                    minBarHeight.value,
                    Math.max(...data.map((d) => d.value))
                ),
            ])
            .range([innerHeight.value, 0]);
        yAxisSelection
            .call(d3.axisLeft(scaleY.value).ticks(3))
            .selectAll(['line', 'path', 'text'])
            .style('font-size', 16)
            .style('stroke', 'white');
    }
}

function getXAttr(seriesName: string) {
    if (!scaleX.value) {
        return '0';
    }

    return scaleX.value(seriesName);
}

function getYAttr(seriesValue: number) {
    if (!scaleY.value) {
        return '0';
    }

    return scaleY.value(seriesValue);
}

function getHeightAttr(seriesValue: number) {
    if (!scaleY.value) {
        return '0';
    }

    return scaleY.value(0) - scaleY.value(seriesValue);
}

function getDPathAttrAverage() {
    if (!scaleX.value || !scaleY.value || renderData.value.length === 0) {
        return '';
    }

    let average =
        renderData.value.map((v) => v.value).reduce((p, c) => p + c) /
        renderData.value.length;

    let stdev = Math.sqrt(
        renderData.value
            .map((v) => (v.value - average) * (v.value - average))
            .reduce((p, c) => p + c) / renderData.value.length
    );

    let r = [];

    r.push([
        d3
            .line()
            .x(function (d: any) {
                return (
                    scaleX.value(renderData.value[d].name) +
                    scaleX.value.bandwidth() * d
                );
            })
            .y(function (d: any) {
                return scaleY.value(average);
            })([0, renderData.value.length - 1]),
        '#aaaaff44',
    ]);

    r.push([
        d3
            .line()
            .x(function (d: any) {
                return (
                    scaleX.value(renderData.value[d].name) +
                    scaleX.value.bandwidth() * d
                );
            })
            .y(function (d: any) {
                return scaleY.value(average + stdev);
            })([0, renderData.value.length - 1]),
        '#aaaaaa55',
    ]);

    r.push([
        d3
            .line()
            .x(function (d: any) {
                return (
                    scaleX.value(renderData.value[d].name) +
                    scaleX.value.bandwidth() * d
                );
            })
            .y(function (d: any) {
                return scaleY.value(average - stdev);
            })([0, renderData.value.length - 1]),
        '#aaaaaa55',
    ]);

    return r;
}
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
                :height="height"
                v-bind:viewBox="`0 0 ${width} ${height}`"
            >
                <g :transform="`translate(${margin.left},${margin.top})`">
                    <g
                        ref="xAxis"
                        :transform="`translate(0,${innerHeight})`"
                    ></g>
                    <g ref="yAxis"></g>
                    <rect
                        v-for="series in renderData"
                        :x="getXAttr(series.name)"
                        :y="getYAttr(Math.max(series.value, minBarHeight))"
                        :width="scaleX?.bandwidth()"
                        :height="
                            getHeightAttr(
                                Math.abs(Math.max(series.value, minBarHeight))
                            )
                        "
                        style="fill: #1aa179"
                    ></rect>
                    <rect
                        v-for="series in renderData"
                        :x="getXAttr(series.name)"
                        :y="
                            getYAttr(Math.max(series.value2 || 0, minBarHeight))
                        "
                        :width="scaleX?.bandwidth()"
                        :height="
                            getHeightAttr(
                                Math.abs(
                                    Math.max(series.value2 || 0, minBarHeight)
                                )
                            )
                        "
                        :style="
                            series.value2 ? `fill: #1a79a1` : `fill: #1a79a100`
                        "
                    ></rect>
                    <path
                        v-for="p in getDPathAttrAverage()"
                        fill="none"
                        :stroke="p[1]"
                        stroke-width="1.5"
                        :d="p[0]"
                    ></path>
                </g>
            </svg>
        </div>
    </div>
</template>
