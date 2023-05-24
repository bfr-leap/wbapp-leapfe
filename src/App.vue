<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router';
import { useRoute } from 'vue-router';

const route = useRoute();

// const leagueId = 6555;;
const leagueId = 637;
</script>

<template>
    <nav
        v-if="
            ['nextEventTimerEmbed'].indexOf(route.query.m?.toString() || '') ==
            -1
        "
        class="navbar navbar-dark navbar-expand-lg bg-primary"
    >
        <div class="container-fluid">
            <RouterLink class="navbar-brand" to="/">
                <img class="icon" v-bind:src="`blue-frog-racing-s4-icon.png`" />
                LEAP</RouterLink
            >
            <!-- <a class="navbar-brand" href="/">
                <img class="icon" v-bind:src="`blue-frog-racing-s4-icon.png`" />
                LEAP</a
            > -->
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
                    <RouterLink
                        class="nav-link"
                        v-bind:to="`/?m=results&league=${leagueId}`"
                        >Results</RouterLink
                    >
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
