<script setup lang="ts">
import { watchEffect, watch, ref } from 'vue';
import type { Ref } from 'vue';
import ComulativeLineChart from '@/components/cumulative-line-chart.vue';
import type { SeriesXY } from '@/models/line-chart-model';
import { getCumulativeDeltaachartModel as getCumulativeDeltaChartModel } from '@/models/cumulative-delta-chart-model';

const props = defineProps<{
    subsession?: string;
    simsession?: string;
}>();

const lapTimes: Ref<SeriesXY[]> = ref([]);

// A cumulative delta chart is a graphical representation of the time differences between two or
// more cars over the course of a race. It is often used in motorsports, particularly in timed racing events,
// to show the difference in lap times between drivers or teams.

// The chart is typically displayed on a computer screen or other electronic display, and it shows the difference
// in lap times between the leader and the other drivers or teams in the race. The x-axis represents the race distance,
// while the y-axis represents the time difference.

// The chart typically starts with the leader's time at zero on the y-axis, and then shows the time difference between
// each driver or team as a cumulative line on the chart. So, for example, if the second-place driver is two seconds
// behind the leader after the first lap, the line for that driver on the chart would start at two seconds on the y-axis.

// As the race progresses, the chart shows how the time differences between the drivers or teams change, and it can be
// a useful tool for spectators, commentators, and drivers to track the progress of the race and see how the different competitors are performing.

// Overall, the cumulative delta chart is a simple yet effective way to visualize the time differences between
// drivers or teams in a race, and it can help provide valuable insights into the dynamics of the competition.

async function fetchModel() {
    if (props.simsession == undefined || props.subsession == undefined) {
        return;
    }

    lapTimes.value = await getCumulativeDeltaChartModel(
        props.simsession || '',
        props.subsession || ''
    );
}

watchEffect(fetchModel);
watch(props, fetchModel);

interface GridItem {
    custid: number;
    is_ai: number;
    displayName: string;
    helmetPattern: number;
    licenseLevel: number;
}
</script>

<template>
    <ComulativeLineChart :series="lapTimes" />
</template>
