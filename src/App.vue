<script setup lang="ts">
import { watch, watchEffect } from 'vue';
import { RouterLink, RouterView } from 'vue-router';
import { useRoute } from 'vue-router';
import { SignedIn, SignedOut, SignInButton, UserButton } from 'vue-clerk';
import IRIdentityCardLink from '@/components/ir-identity-card-link.vue';

const route = useRoute();

let leagueId = '6555';

function fetchModel() {
    leagueId = route.query.league as string;
    if (!leagueId) {
        leagueId = '6555';
    }
}

watchEffect(fetchModel);
watch(route, fetchModel);
</script>

<template>
    <nav v-if="['nextEventTimerEmbed', 'subsessionSummaryEmbed'].indexOf(route.query.m?.toString() || '') ==
        -1
        " class="navbar navbar-dark navbar-expand-lg bg-nav">
        <div class="container-fluid">
            <div>
                <button class="me-2 navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav"
                    aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                    <span class="navbar-toggler-icon"></span>
                </button>

                <RouterLink class="navbar-brand " to="/">
                    <img class="icon" v-bind:src="`blue-frog-racing-s4-icon.png`" />
                    LEAP
                </RouterLink>

            </div>

            <div class="collapse_ navbar-collapse" id="navbarNav">
                <div class="navbar-nav">
                    <RouterLink class="nav-link" v-bind:to="`/?m=results&league=${leagueId}`">Results</RouterLink>
                </div>
            </div>
            <SignedOut>
                <SignInButton />
            </SignedOut>
            <SignedIn>

                <div style="display:inline-flex">
                    <IRIdentityCardLink />
                    <UserButton />
                </div>


            </SignedIn>
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
