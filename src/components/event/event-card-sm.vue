<script setup lang="ts">
import { getshortTrackName } from '@@/src/utils/track-utils';
import { ref, watchEffect } from 'vue';
import type { Ref } from 'vue';
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

async function fetchModel() {
    return await getshortTrackName(props.track_id);
}

const shortName: Ref<string> = await asyncDataWithReactiveModel<string>(
    `EventCardsSmallModel-${props.track_id}`,
    fetchModel,
    () => '',
    [
        () => props.track_id,
        () => props.is_next,
        () => props.date,
        () => props.is_selected,
    ]
);
</script>

<template>
    <div class="wrap">
        <img class="bg" v-bind:src="`./tracks/${track_id.replace('-', 'n')}.jpg`" />
        <div
            v-if="is_next"
            v-bind:class="`${
                is_selected ? 'selected' : 'hv'
            } content d-flex align-items-center justify-content-center fs-6 text-center h-100`"
        >
            <div>Next Race</div>
        </div>

        <div
            v-else
            v-bind:class="`${
                is_selected ? 'selected' : 'hv'
            } content d-flex h-100`"
        >
            <div
                class="d-flex flex-column fs-6 justify-content-center mx-1 mx-sm-3"
            >
                <div class="" style="line-height: 1rem">
                    <span>{{
                        shortMonthNames[new Date(date).getMonth()]
                    }}</span>
                </div>
                <div
                    class="d-flex d-sm-none justify-content-center fs-4"
                    style="line-height: 1em"
                >
                    <span>{{ new Date(date).getDate() }}</span>
                </div>
                <div
                    class="d-none d-sm-flex d-md-none justify-content-center fs-2"
                    style="line-height: 1em"
                >
                    <span>{{ new Date(date).getDate() }}</span>
                </div>
                <div
                    class="d-none d-sm-none d-md-flex justify-content-center fs-1"
                    style="line-height: 1em"
                >
                    <span>{{ new Date(date).getDate() }}</span>
                </div>
            </div>
            <div
                class="fs-6 d-flex d-sm-none flex-grow-1 justify-content-center align-items-center"
            >
                {{ shortName }}
            </div>
            <div
                class="fs-3 d-none d-sm-flex d-md-none flex-grow-1 justify-content-center align-items-center"
            >
                {{ shortName }}
            </div>
            <div
                class="fs-2 d-none d-sm-none d-md-flex flex-grow-1 justify-content-center align-items-center"
            >
                {{ shortName }}
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
    object-fit: cover;
}

.content {
    position: relative;
}
.hv:hover,
.selected {
    background-color: var(--gh-canvas-inset);
}
</style>
