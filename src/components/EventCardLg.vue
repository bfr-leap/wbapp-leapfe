<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import type { Ref } from 'vue';
import { getTrackName } from '../track-utils';

const props = defineProps<{
    track_id: string;
    is_next: boolean;
    date: Date;
    car_id: string;
    league_id: string;
}>();

let countdown: Ref<String> = ref('---');
let timer: number = 0;
let trackName: Ref<string> = ref('---');

async function fectchJsonData() {
    updateTimer();
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
    countdown.value = `${d} D  ${h} H  ${min} M  ${sec} S`;

    trackName.value = await getTrackName(props.track_id);
}
watchEffect(fectchJsonData);
</script>

<template>
    <div class="">
        <div class="wrap track-bg">
            <img class="bg" v-bind:src="`./tracks/${track_id}.jpg`" />
            <div class="content">
                <div class="row text-center">
                    <div class="col fs-1 padded-title">
                        {{ trackName }}
                    </div>
                </div>
                <div class="row text-center">
                    <div>
                        <span class="fs-5 badge text-bg-primary rounded-pill">
                            <RouterLink
                                class="link-light"
                                v-bind:to="`?m=track&league=${props.league_id}&car=${props.car_id}&track=${props.track_id}`"
                                >track stats</RouterLink
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
                        {{ countdown }}
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
}
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

.padded-title {
    margin-top: 3em;
}
</style>
