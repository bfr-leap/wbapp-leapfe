<script setup lang="ts">
import { ref, watch, watchEffect } from 'vue';
import { RouterLink, RouterView } from 'vue-router';
import { useRoute } from 'vue-router';
import { SignedIn, SignedOut, SignInButton } from 'vue-clerk';
import IRIdentityCardLink from '@/components/user/ir-identity-card-link.vue';
import { useAuth } from 'vue-clerk';
import { getUserLeaguesState } from '@/utils/fetch-util';
import type { Ref } from 'vue';
import { preFetch, defLgSeasSubCtx, setAuth } from '@/utils/fetch-util';
import RouterLinkProxy from '@/components/nav/router-link-proxy.vue';

const route = useRoute();
const auth = useAuth();

let league: Ref<string> = ref('');
let season: Ref<string> = ref('');
let subsession: Ref<string> = ref('');
let isMounted: Ref<boolean> = ref(false);

async function fetchModel() {
    setAuth(auth);
    await preFetch(route.query);
    const ctx = await defLgSeasSubCtx(
        route.query.league as string,
        route.query.season as string,
        route.query.subsession as string
    );
    league.value = ctx.league_id;
}

// watchEffect(fetchModel);
watch(route, fetchModel);
</script>

<template>
    <nav
        v-if="
            ['nextEventTimerEmbed', 'subsessionSummaryEmbed'].indexOf(
                route.query.m?.toString() || ''
            ) == -1
        "
        class="navbar navbar-dark navbar-expand-lg bg-nav"
    >
        <div class="container-fluid">
            <div>
                <button
                    class="me-2 navbar-toggler"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#navbarNav"
                    aria-controls="navbarNav"
                    aria-expanded="false"
                    aria-label="Toggle navigation"
                >
                    <span class="navbar-toggler-icon"></span>
                </button>

                <RouterLinkProxy class="navbar-brand" to="/">
                    <img
                        class="icon"
                        v-bind:src="`blue-frog-racing-s4-icon.png`"
                    />
                    LEAP
                </RouterLinkProxy>
            </div>

            <div class="collapse navbar-collapse" id="navbarNav">
                <div class="navbar-nav">
                    <RouterLinkProxy
                        class="nav-link"
                        v-bind:to="`/?m=results&league=${league}`"
                        >Results</RouterLinkProxy
                    >
                </div>
            </div>
            <SignedOut>
                <SignInButton />
            </SignedOut>
            <SignedIn>
                <div style="display: inline-flex">
                    <IRIdentityCardLink />
                </div>
            </SignedIn>
        </div>
    </nav>

    <RouterView />

    <div class="text-center">
        <a
            href="https://www.bluefrogracing.com/"
            class="text-bg"
            target="_blank"
            rel="noopener noreferrer"
            >Live Event Analysis and Performance by Blue Frog Racing.</a
        >
    </div>
</template>

<style scoped>
.icon {
    height: 1.5em;
    width: 1.5em;
    border-radius: 1em;
}

.text-bg {
    color: #888;
}
</style>
