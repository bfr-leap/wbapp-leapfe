<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router';
import HelloWorld from './components/HelloWorld.vue';
</script>

<template>
    <nav class="navbar navbar-dark navbar-expand-lg bg-primary">
        <div class="container-fluid">
            <!-- <a class="navbar-brand" href="#">LEAP</a> -->
            <RouterLink class="navbar-brand" to="/">
                <img class="icon" v-bind:src="`blue-frog-racing-s4-icon.png`" />
                LEAP</RouterLink
            >
            <button
                class="navbar-toggler"
                type="button"
                data-bs-toggle="collapse"
                data-bs-target="#navbarNav"
                aria-controls="navbarNav"
                aria-expanded="false"
                aria-label="Toggle navigation"
            >
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
                <div class="navbar-nav">
                    <!-- <RouterLink class="nav-link" to="/">Home</RouterLink> -->
                    <RouterLink class="nav-link" to="/?m=results&league=6555"
                        >Results</RouterLink
                    >
                    <!-- <RouterLink
                        class="nav-link"
                        to="/?m=standings&league=6555&season=80139"
                        >Driver Standings</RouterLink
                    >
                    <RouterLink
                        class="nav-link"
                        to="/?m=driver&league=6555&driver=174470"
                        >Driver</RouterLink
                    >
                    <RouterLink
                        class="nav-link"
                        to="/?m=track&league=6555&car=106&track=239"
                        >Track</RouterLink
                    > -->
                </div>
            </div>
        </div>
    </nav>

    <RouterView />

    <div class="text-center">
        Live Event Analysis and Performance by Blue Frog Racing
    </div>
</template>

<style scoped>
.icon {
    height: 1.5em;
    width: 1.5em;
    border-radius: 1em;
}
</style>
