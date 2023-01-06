<script setup lang="ts">
import { ref, onMounted, nextTick, computed, watch } from 'vue';

const d3: any = (<any>globalThis).d3;
const aspectRatio = 0.37;

const props = withDefaults(
    defineProps<{
        data?: { name: string; value: number }[];
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

watch(() => props.data, redrawAxis); // reset the d3 avg axis when the data changes.
function redrawAxis() {
    if (svgRoot.value /*&& props.data.length > 0*/) {
        height.value = svgRoot.value.clientWidth * aspectRatio;
        width.value = svgRoot.value.clientWidth;

        // add x axis
        const xAxisSelection = d3.select(xAxis.value);
        xAxisSelection.html(''); // clears the  inner nodes
        scaleX.value = d3
            .scaleBand()
            .padding(0.1)
            .domain(props.data.map((d) => d.name))
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
            .domain([0, Math.max(...props.data.map((d) => d.value))])
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
</script>

<template>
    <div>
        <div>
            {{ title }}
        </div>
        <div ref="divRoot">
            <svg ref="svgRoot" class="w-100" :height="height">
                <g :transform="`translate(${margin.left},${margin.top})`">
                    <g
                        ref="xAxis"
                        :transform="`translate(0,${innerHeight})`"
                    ></g>
                    <g ref="yAxis"></g>
                    <rect
                        v-for="series in data"
                        :x="getXAttr(series.name)"
                        :y="getYAttr(series.value)"
                        :width="scaleX?.bandwidth()"
                        :height="getHeightAttr(series.value)"
                        style="fill: #1aa179"
                    ></rect>
                </g>
            </svg>
        </div>
    </div>
</template>
