<script setup lang="ts">
import { ref, watch } from 'vue';
import type { Ref } from 'vue';
import type { EventCardPastModel } from '@@/src/models/event/event-card-past-model';
import {
    getEventCardPastModel,
    getDefaultEventCardPastModel,
} from '@@/src/models/event/event-card-past-model';

const props = defineProps<{
    track_id: string;
    date: Date;
    is_selected: boolean;
    winner_name?: string;
    headline?: string;
    protagonist_finish?: number;
    subsession_id?: string;
}>();

// The winner's finish-line capture layers over the generic track
// photo when it loads; capture coverage is still sparse, so falling
// back to the track photo on a 404 is the common case, not an error
// state.
const winnerCaptureFailed = ref(false);
watch(
    () => props.subsession_id,
    () => {
        winnerCaptureFailed.value = false;
    }
);

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

const model: Ref<EventCardPastModel> =
    await asyncDataWithReactiveModel<EventCardPastModel>(
        `EventCardPastModel-${props.track_id}`,
        () => getEventCardPastModel(props.track_id),
        getDefaultEventCardPastModel,
        [() => props.track_id, () => props.date, () => props.is_selected]
    );
</script>

<template>
    <article v-bind:class="['wrap', is_selected ? 'selected' : 'hv']">
        <img
            class="bg"
            v-bind:src="`./tracks/${track_id.replace('-', 'n')}.jpg`"
        />
        <img
            v-if="subsession_id && !winnerCaptureFailed"
            class="bg bg--winner"
            v-bind:src="`/api/trkcam/winner/${subsession_id}`"
            alt=""
            loading="lazy"
            @error="winnerCaptureFailed = true"
        />
        <div class="content">
            <header
                class="top d-flex justify-content-between align-items-start"
            >
                <div class="meta">
                    <span class="meta__date">
                        {{ shortMonthNames[new Date(date).getMonth()] }}
                        {{ new Date(date).getDate() }}
                    </span>
                    <span class="meta__track">{{ model.shortTrackName }}</span>
                </div>
                <span
                    v-if="protagonist_finish"
                    class="finish-badge"
                    title="Your finishing position"
                >
                    P{{ protagonist_finish }}
                </span>
            </header>

            <div class="body">
                <h3 v-if="headline" class="headline">{{ headline }}</h3>
                <h3 v-else class="headline headline--fallback">
                    {{ model.shortTrackName || 'Race Recap' }}
                </h3>
            </div>

            <footer v-if="winner_name" class="footer">
                <span class="footer__label">Winner</span>
                <span class="footer__name">{{ winner_name }}</span>
            </footer>
        </div>
    </article>
</template>

<style scoped>
.wrap {
    position: relative;
    isolation: isolate;
    overflow: hidden;
    background: var(--surface-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md, 8px);
    aspect-ratio: 16 / 10;
    min-height: 180px;
    transition: transform 120ms ease, border-color 120ms ease;
}
.wrap::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
        180deg,
        rgba(0, 0, 0, 0.35) 0%,
        rgba(0, 0, 0, 0.55) 45%,
        rgba(0, 0, 0, 0.9) 100%
    );
    z-index: 1;
    pointer-events: none;
}
.hv:hover {
    transform: translateY(-1px);
    border-color: var(--border-strong, var(--border-subtle));
}
.selected {
    box-shadow: inset 0 0 0 2px var(--accent);
}

.bg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.7;
    z-index: 0;
}

.bg--winner {
    opacity: 0.85;
}

.content {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 12px 14px;
    color: var(--text-primary);
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.85);
}

.top {
    flex: 0 0 auto;
}

.meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-family: var(--font-mono);
    font-size: 0.72rem;
    line-height: 1;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    opacity: 0.9;
}
.meta__date {
    font-weight: 700;
}
.meta__track {
    opacity: 0.75;
}

.finish-badge {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    font-weight: 700;
    line-height: 1;
    padding: 3px 6px;
    border-radius: var(--radius-sm, 4px);
    background: rgba(0, 0, 0, 0.65);
    border: 1px solid var(--border-subtle);
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
}

.body {
    flex: 1 1 auto;
    display: flex;
    align-items: flex-end;
    padding-bottom: 4px;
}

.headline {
    font-size: 1.05rem;
    font-weight: 700;
    line-height: 1.2;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
.headline--fallback {
    opacity: 0.7;
    font-weight: 600;
    font-size: 1.25rem;
}

.footer {
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding-top: 6px;
    border-top: 1px solid rgba(255, 255, 255, 0.12);
    font-size: 0.78rem;
    line-height: 1.1;
}
.footer__label {
    font-family: var(--font-mono);
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.65;
}
.footer__name {
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

@media (max-width: 575.98px) {
    .wrap {
        aspect-ratio: auto;
        min-height: 140px;
    }
    .headline {
        font-size: 0.95rem;
        -webkit-line-clamp: 2;
    }
}
</style>
