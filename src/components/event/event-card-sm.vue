<script setup lang="ts">
import type { Ref } from 'vue';
import type { EventCardSmModel } from '@@/src/models/event/event-card-sm-model';
import {
    getEventCardSmModel,
    getDefaultEventCardSmModel,
} from '@@/src/models/event/event-card-sm-model';

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

const model: Ref<EventCardSmModel> =
    await asyncDataWithReactiveModel<EventCardSmModel>(
        `EventCardsSmallModel-${props.track_id}`,
        () => getEventCardSmModel(props.track_id),
        getDefaultEventCardSmModel,
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
        <img
            class="bg"
            v-bind:src="`./tracks/${track_id.replace('-', 'n')}.jpg`"
        />
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
                {{ model.shortTrackName }}
            </div>
            <div
                class="fs-3 d-none d-sm-flex d-md-none flex-grow-1 justify-content-center align-items-center"
            >
                {{ model.shortTrackName }}
            </div>
            <div
                class="fs-2 d-none d-sm-none d-md-flex flex-grow-1 justify-content-center align-items-center"
            >
                {{ model.shortTrackName }}
            </div>
        </div>
    </div>
</template>

<style scoped>
.wrap {
    overflow: hidden;
    position: relative;
    isolation: isolate;
    background: var(--surface-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
}
.wrap::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
        180deg,
        rgba(0, 0, 0, 0.5) 0%,
        rgba(0, 0, 0, 0.7) 100%
    );
    z-index: 1;
    pointer-events: none;
}

.bg {
    opacity: 0.5;
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 0;
}

.content {
    position: relative;
    z-index: 2;
    color: var(--text-primary);
    font-weight: 600;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.85);
}
.hv:hover {
    background-color: rgba(255, 255, 255, 0.06);
}
.selected {
    box-shadow: inset 0 0 0 1px var(--accent);
}
</style>
