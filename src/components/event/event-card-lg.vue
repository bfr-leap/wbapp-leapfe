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
let timer: any = 0;

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
            <img class="bg track-bg" v-bind:src="`./tracks/${track_id.replace('-', 'n')}.jpg`" />
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
                    <div>
                        <span class="fs-5 badge text-bg-primary rounded-pill">
                            <a
                                v-if="props.embed_mode"
                                class="link-light"
                                target="_blank"
                                rel="noopener noreferrer"
                                v-bind:href="`?m=track&league=${props.league_id}&car=${props.car_id}&track=${props.track_id}`"
                                >track stats</a
                            >
                            <RouterLinkProxy
                                v-else
                                class="link-light"
                                v-bind:to="`?m=track&league=${props.league_id}&car=${props.car_id}&track=${props.track_id}`"
                                >track stats</RouterLinkProxy
                            ></span
                        >
                    </div>
                </div>
                <div class="row text-center">
                    <div class="col fs-2">
                        {{ new Date(date).toLocaleString() }}
                    </div>
                </div>
                <div class="row text-center" style="margin: 0">
                    <div class="col fs-2 padded-title bg-secondary">
                        <span style="color: transparent">:: </span
                        ><ClientOnly>{{ countdown }}</ClientOnly
                        ><span style="color: transparent"> ::</span>
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
    opacity: 0.3;
}

.track-logo {
    object-fit: contain;
    background: #ffffff44;
    /* background-position: center; */
    width: 100%;
    height: 6em;
}
.wrap {
    overflow: hidden;
    position: relative;
}

.bg {
    position: absolute;
    left: 0;
    top: 0;
}

.content {
    position: relative;
}

.padded-title {
    margin-top: 3em;
}
</style>
