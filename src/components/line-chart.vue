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

import type { SeriesXY } from '@/models/line-chart-model';

export type PickNumericProps<T> = {
    [P in keyof T as T[P] extends number ? P : never]: T[P];
};

const d3: any = (<any>globalThis).d3;
const aspectRatio = 0.5;

const props = defineProps<{
    data: SeriesXY[];
    title?: string;
    yRange?: [number, number];
}>();

const svgRoot = ref<SVGGElement | null>(null);
const divRoot = ref<HTMLElement | null>(null);
const xAxis = ref<SVGGElement | null>(null);
const yAxis = ref<SVGGElement | null>(null);
const height = ref(100);
const width = ref(100);

const margin = { top: 10, right: 10, bottom: 30, left: 50 };
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
    if (svgRoot.value && props.data.length > 0) {
        height.value = svgRoot.value.clientWidth * aspectRatio;
        width.value = svgRoot.value.clientWidth;

        // add x axis
        const xAxisSelection = d3.select(xAxis.value);
        xAxisSelection.html(''); // clears the  inner nodes
        scaleX.value = d3
            .scaleLinear()
            .domain(
                d3.extent(props.data[0].data, (d: any) => {
                    return d.x;
                })
            )
            .range([0, innerWidth.value]);
        const axisX = d3
            .axisBottom(scaleX.value)
            .tickValues(props.data[0].data.map((d) => d.x))
            .tickFormat(d3.format('d'));
        axisX(xAxisSelection);
        xAxisSelection
            .call(d3.axisBottom(scaleX.value).ticks(5))
            .selectAll(['line', 'path', 'text'])
            .style('font-size', 16)
            .style('stroke', 'white');

        let maxY = d3.max(props.data, (sXY: SeriesXY) =>
            d3.max(sXY.data, (d: any) => d.y)
        );
        let minY = d3.min(props.data, (sXY: SeriesXY) =>
            d3.min(sXY.data, (d: any) => d.y)
        );

        if (props.yRange) {
            minY = props.yRange[0];
            maxY = props.yRange[1];
        }

        // add y axis
        const yAxisSelection = d3.select(yAxis.value);
        yAxisSelection.html('');
        scaleY.value = d3
            .scaleLinear()
            .domain([minY, maxY])
            .range([innerHeight.value, 0]);
        yAxisSelection
            .call(d3.axisLeft(scaleY.value).ticks(5))
            .selectAll(['line', 'path', 'text'])
            .style('font-size', 16)
            .style('stroke', 'white');
    }
}

function getDPathAttr(series: SeriesXY) {
    if (!scaleX.value || !scaleY.value) {
        return '';
    }

    const linePath = d3
        .line()
        .x(function (d: any) {
            return scaleX.value(d.x);
        })
        .y(function (d: any) {
            return scaleY.value(d.y);
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

const toggleState = reactive<boolean[]>([]);
watchEffect(() => {
    toggleState.splice(0, toggleState.length, ...props.data.map(() => true));
});
function getColor(seriesIndex: number) {
    const baseColor = baseColors[seriesIndex % baseColors.length];
    const dColor = d3.color(baseColor);
    dColor.opacity = toggleState[seriesIndex] ? 1 : 0.03;
    return dColor.formatRgb();
}
function onToggle(seriesIndex: number) {
    toggleState[seriesIndex] = !toggleState[seriesIndex];
}
function onToggleAll() {
    toggleState.forEach((ts, i) => (toggleState[i] = !ts));
}
</script>

<template>
    <div>
        {{ title }}
    </div>
    <div ref="divRoot" style="overflow: hidden">
        <svg ref="svgRoot" v-bind:viewBox="`0 0 ${width} ${height}`">
            <g :transform="`translate(${margin.left},${margin.top})`">
                <g ref="xAxis" :transform="`translate(0,${innerHeight})`"></g>
                <g ref="yAxis"></g>
                <path
                    v-for="(series, i) in data"
                    fill="none"
                    :stroke="getColor(i)"
                    :stroke-dasharray="basePatterns[i % basePatterns.length]"
                    stroke-width="1.5"
                    :d="getDPathAttr(series)"
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
        <div v-for="(series, i) in data" class="p-1">
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
