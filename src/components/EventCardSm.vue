<script setup lang="ts">
import { getshortTrackName } from '../track-utils';
const props = defineProps<{
    track_id: string;
    is_next: boolean;
    date: Date;
    is_selected: boolean;
}>();

const shortMonthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
];
</script>

<template>
    <div class="wrap">
        <img class="bg" v-bind:src="`./tracks/${track_id}.jpg`" />
        <div
            v-if="is_next"
            v-bind:class="`${
                is_selected ? 'selected' : 'hv'
            } content row fs-2 text-center`"
        >
            <div style="margin: 0.5em 0em">Next Race</div>
        </div>

        <div
            v-else
            v-bind:class="`${is_selected ? 'selected' : 'hv'} content row`"
        >
            <div class="col fs-2">
                <div class="row text-center">
                    <span>{{
                        shortMonthNames[new Date(date).getMonth()]
                    }}</span>
                </div>
                <div class="row text-center">
                    <span>{{ new Date(date).getDate() }}</span>
                </div>
            </div>
            <div class="col fs-4 text-center" style="margin: auto">
                {{ getshortTrackName(track_id) }}
            </div>
        </div>
    </div>
</template>

<style scoped>
.wrap {
    overflow: hidden;
    position: relative;
}

.bg {
    opacity: 0.3;
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
}

.content {
    position: relative;
}
.hv:hover,
.selected {
    background-color: black;
}
</style>
