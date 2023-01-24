<script setup lang="ts">
import { ref, onMounted, nextTick, computed, watch } from 'vue';

const d3: any = (<any>globalThis).d3;
const aspectRatio = 0.37;

const props = withDefaults(
    defineProps<{
        data?: { name: string; hi: number; lo: number }[];
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
const xAxis = ref<SVGGElement | null>(null);
const yAxis = ref<SVGGElement | null>(null);
const height = ref(100);
const width = ref(100);
const renderData = ref<{ name: string; hi: number; lo: number }[]>([]);

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

const minBarHeight = ref<number>(0.2);

watch(() => props.data, redrawAxis); // reset the d3 avg axis when the data changes.
function redrawAxis() {
    const data: {
        name: string;
        hi: number;
        lo: number;
    }[] = JSON.parse(JSON.stringify(props.data));
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
        scaleY.value = d3
            .scaleLinear()
            .domain([
                Math.min(Math.min(...data.map((d) => Math.min(d.hi, d.lo))), 0),
                Math.max(Math.max(...data.map((d) => Math.max(d.hi, d.lo))), 0),
            ])
            .range([innerHeight.value, 0]);
        yAxisSelection
            .call(d3.axisLeft(scaleY.value).ticks(3))
            .selectAll(['line', 'path', 'text'])
            .style('font-size', 16)
            .style('stroke', 'white');
    }

    minBarHeight.value = Math.abs(
        Math.max(...data.map((d) => Math.max(Math.abs(d.hi), Math.abs(d.lo)))) /
            150
    );
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
                        :y="getYAttr(Math.max(series.hi, series.lo))"
                        :width="scaleX?.bandwidth()"
                        :height="
                            getHeightAttr(
                                Math.max(
                                    Math.max(series.hi, series.lo) -
                                        Math.min(series.hi, series.lo),
                                    minBarHeight
                                )
                            )
                        "
                        :style="`fill: ${
                            series.hi >= series.lo ? '#1aa179' : '#a1791a'
                        }`"
                    ></rect>
                </g>
            </svg>
        </div>
    </div>
</template>
