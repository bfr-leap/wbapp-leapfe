<script setup lang="ts">
import { watchEffect, ref } from 'vue';
import type { Ref } from 'vue';
import LineChart from './LineChart.vue';
import type { SeriesXY } from './LineChart.vue';

const props = defineProps<{
    series: SeriesXY[];
}>();

const titleOut: Ref<string> = ref('');
const seriesOut: Ref<SeriesXY[]> = ref([]);
const yRange: Ref<number[]> = ref([0, 1]);

function getSeriesDeltas(lapTimes: SeriesXY[]): {
    data: SeriesXY[];
    baselineTime: number;
} {
    let baselineTime = Math.round(
        lapTimes
            .map((driverLaps: SeriesXY) =>
                driverLaps.data
                    .map((lapTime) => lapTime.y)
                    .reduce(function (min, value, _, { length }) {
                        if (value <= 1 || isNaN(value)) {
                            return min;
                        }
                        return Math.min(min, value);
                    }, Infinity)
            )
            .reduce(function (min, value, _, { length }) {
                if (value <= 1 || isNaN(value)) {
                    return min;
                }
                return Math.min(min, value);
            }, Infinity) * 1.07
    );

    // if rounding doesn't work try again
    if (baselineTime === Infinity || baselineTime === 1) {
        baselineTime =
            lapTimes
                .map(
                    (driverLaps: SeriesXY) =>
                        driverLaps.data
                            .map((lapTime) => lapTime.y)
                            .reduce(function (p, value, _, { length }) {
                                if (value <= 0 || isNaN(value)) {
                                    return Infinity;
                                }
                                return p + value;
                            }, 0) / driverLaps.data.length
                )
                .reduce(function (min, value, _, { length }) {
                    if (isNaN(value)) {
                        return min;
                    }
                    return Math.min(min, value);
                }, Infinity) * 1.07;
    }

    let ret: { x: number; y: number }[][] = lapTimes.map((dLapTimes) =>
        dLapTimes.data.map((dLapTime) => {
            return {
                x: dLapTime.x,
                y: dLapTime.y - baselineTime,
            };
        })
    );

    for (let dDeltas of ret) {
        dDeltas.shift();

        for (let i = 1; i < dDeltas.length; ++i) {
            dDeltas[i].y += dDeltas[i - 1].y;
        }
    }

    return {
        data: ret.map((v, i) => {
            return { name: lapTimes[i].name, data: v };
        }),
        baselineTime,
    };
}

watchEffect(async () => {
    const seriesAndDelta = getSeriesDeltas(props.series);

    const baseLine = seriesAndDelta.baselineTime;
    titleOut.value = `Baseline ${Number(baseLine).toFixed(2)}s`;

    seriesOut.value = seriesAndDelta.data;
    // seriesOut.value = props.series;

    if (!seriesOut.value.length) {
        return;
    }

    yRange.value[0] = seriesOut.value[0].data[0].y;
    yRange.value[1] = seriesOut.value[0].data[0].y;

    let lapNum = seriesOut.value[0].data.length;

    const relevantLapPercent = 0.95;

    for (let singleSeries of seriesOut.value) {
        let r1 = yRange.value[0];
        let r2 = yRange.value[1];
        for (let lDelta of singleSeries.data) {
            r1 = Math.max(r1, lDelta.y);
            r2 = Math.min(r2, lDelta.y);
        }

        if (lapNum * relevantLapPercent <= singleSeries.data.length) {
            yRange.value[0] = r1;
            yRange.value[1] = r2;
        } else {
            break;
        }
    }
});
</script>

<template>
    <LineChart
        :title="titleOut"
        :data="seriesOut"
        :y-range="[yRange[0], yRange[1]]"
    />
</template>
