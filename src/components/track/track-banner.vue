<script setup lang="ts">
import { toRef } from 'vue';

const props = defineProps<{
    trackId: string;
    subsessionId?: string;
}>();

// The subsession winner's finish-line capture layers over the
// generic track photo when it loads; falls back to the track photo
// alone (today's banner) whenever there's no capture for this
// subsession yet.
const { failed: winnerCaptureFailed, onError: onWinnerCaptureError } =
    useImageFallback(toRef(props, 'subsessionId'));
</script>

<template>
    <div class="wrap">
        <img class="bg" v-bind:src="`./tracks/${props.trackId}.jpg`" />
        <img
            v-if="subsessionId && !winnerCaptureFailed"
            class="bg bg--winner"
            v-bind:src="`/api/trkcam/winner/${subsessionId}`"
            alt=""
            loading="lazy"
            @error="onWinnerCaptureError"
        />
        <div class="cont row">
            <div class="col-6 cont">
                <div class="cont">
                    <img
                        class="logo"
                        v-bind:src="`./tracks/${props.trackId}_logo.png`"
                    />
                </div>
            </div>
            <div class="col-6 cont">
                <div class="cont">
                    <img
                        class="logo"
                        v-bind:src="`./tracks/${props.trackId}_map.svg`"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.logo {
    object-fit: contain;
    width: 100%;
    height: 100%;
    padding-top: 10px;
    padding-bottom: 10px;
    filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.55))
        drop-shadow(0 0 6px rgba(255, 255, 255, 0.25));
}
.wrap {
    width: 100%;
    height: 8em;
    overflow: hidden;
    position: relative;
    background-color: var(--gh-canvas-subtle);
    border-radius: var(--gh-radius-md);
}
.bg {
    opacity: 0.5;
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.bg--winner {
    opacity: 0.85;
}

.cont {
    height: 8em;
    position: relative;
}
</style>
