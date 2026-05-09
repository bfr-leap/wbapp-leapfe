<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import type { Ref } from 'vue';
import { getTrackName } from '@@/src/utils/track-utils';
import RouterLinkProxy from '@@/src/components/nav/router-link-proxy.vue';

const props = defineProps<{
    track_id: string;
    is_next: boolean;
    date: Date;
    car_id: string;
    league_id: string;
    embed_mode?: boolean;
}>();

let countdown: Ref<String> = ref('---');
let timer: ReturnType<typeof setTimeout> | 0 = 0;

async function fetchModel() {
    updateTimer();
    return await getTrackName(props.track_id);
}

async function updateTimer() {
    if (!timer) {
        timer = setTimeout(() => {
            timer = 0;
            updateTimer();
        }, 1000);
    }

    let delta = new Date(props.date).getTime() - new Date().getTime();
    let sec = Math.round(delta / 1000);
    let min = Math.floor(sec / 60);
    let h = Math.floor(min / 60);
    let d = Math.floor(h / 24);
    h %= 24;
    min %= 60;
    sec %= 60;
    countdown.value = `${d} D  ${h} H  ${min} M  ${sec < 10 ? 0 : ''}${sec} S`;
}

const trackName: Ref<string> = await asyncDataWithReactiveModel<string>(
    `EventCardLgModel-${props.track_id}`,
    fetchModel,
    () => '---',
    [
        () => props.track_id,
        () => props.is_next,
        () => props.date,
        () => props.car_id,
        () => props.league_id,
        () => props.embed_mode,
    ]
);

updateTimer();
</script>

<template>
    <div class="">
        <div class="wrap">
            <img
                class="bg track-bg"
                v-bind:src="`./tracks/${track_id.replace('-', 'n')}.jpg`"
            />
            <img
                class="bg track-logo"
                v-bind:src="`./tracks/${track_id.replace('-', 'n')}_logo.png`"
            />
            <div class="content">
                <div class="row text-center">
                    <div class="col fs-1 padded-title">
                        {{ trackName }}
                    </div>
                </div>
                <div class="row text-center">
                    <div class="col">
                        <a
                            v-if="props.embed_mode"
                            class="button button--ghost button--mono"
                            target="_blank"
                            rel="noopener noreferrer"
                            v-bind:href="`?m=track&league=${props.league_id}&car=${props.car_id}&track=${props.track_id}`"
                            >Track Stats →</a
                        >
                        <RouterLinkProxy
                            v-else
                            class="button button--ghost button--mono"
                            v-bind:to="`?m=track&league=${props.league_id}&car=${props.car_id}&track=${props.track_id}`"
                            >Track Stats →</RouterLinkProxy
                        >
                    </div>
                </div>
                <div class="row text-center">
                    <div class="col fs-2">
                        {{ new Date(date).toLocaleString() }}
                    </div>
                </div>
                <div class="row text-center" style="margin: 0">
                    <div class="col countdown-tape num-mono">
                        <span class="countdown-label">T −</span
                        ><ClientOnly>{{ countdown }}</ClientOnly>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.track-bg {
    background-size: cover;
    background-position: center;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.6;
}

.track-logo {
    object-fit: contain;
    background: rgba(240, 246, 252, 0.05);
    width: 100%;
    height: 6em;
    /* Halo so dark monochrome logos read on the dark track photo. */
    filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.55))
        drop-shadow(0 0 6px rgba(255, 255, 255, 0.25));
}
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
        rgba(0, 0, 0, 0.35) 0%,
        rgba(0, 0, 0, 0.55) 50%,
        rgba(0, 0, 0, 0.85) 100%
    );
    z-index: 1;
    pointer-events: none;
}

.bg {
    position: absolute;
    left: 0;
    top: 0;
    z-index: 0;
}

.content {
    position: relative;
    z-index: 2;
    color: var(--text-primary);
    font-weight: 600;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.85);
}

.padded-title {
    margin-top: 3em;
}

.countdown-tape {
    background: #000;
    color: var(--you);
    font-size: var(--text-lg);
    letter-spacing: 0.06em;
    padding: var(--space-2) var(--space-3);
    border-top: 1px solid var(--border-subtle);
    text-shadow: none;
}

.countdown-label {
    color: var(--text-muted);
    margin-right: var(--space-2);
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: var(--tracking-wide);
}
</style>
