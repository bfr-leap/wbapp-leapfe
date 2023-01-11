<script setup lang="ts">
const props = defineProps<{
    trackId: string;
}>();
</script>

<template>
    <div class="wrap">
        <img class="bg" v-bind:src="`./tracks/${props.trackId}.jpg`" />
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
}
.wrap {
    width: 100%;
    height: 8em;
    overflow: hidden;
    position: relative;
    background-color: aliceblue;
    overflow: hidden;
}
.bg {
    opacity: 0.5;
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    object-fit: cover;
}

.cont {
    height: 8em;
    position: relative;
}
</style>
