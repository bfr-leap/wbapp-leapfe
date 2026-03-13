<script setup lang="ts">
import { ref, watch, watchEffect } from 'vue';
import { RouterLink, RouterView } from 'vue-router';
import { useRoute } from 'vue-router';
import { SignedIn, SignedOut, SignInButton } from 'vue-clerk';
import IRIdentityCardLink from '@@/src/components/user/ir-identity-card-link.vue';
import { useAuth } from 'vue-clerk';
import { getUserLeaguesState } from '@@/src/utils/fetch-util';
import type { Ref } from 'vue';
import {
    preFetch,
    defLgSeasSubCtx,
    setAuth,
    setToken,
} from '@@/src/utils/fetch-util';
import RouterLinkProxy from '@@/src/components/nav/router-link-proxy.vue';
import HomeView from '@@/src/views/HomeView.vue';

const route = useRoute();
const auth = useAuth();
setAuth(auth);

const serverInitialState = useState<AuthObject | undefined>(
    'clerk-initial-state'
);

if (import.meta.server) {
    const token = serverInitialState.value?.token;
    setToken(token);
}

async function fetchModel() {
    //await preFetch(route.query);
    return await defLgSeasSubCtx(
        route.query.league as string,
        route.query.season as string,
        route.query.subsession as string
    );
}

function getDefaultModel() {
    return {
        league_id: 0,
        season_id: 0,
        subsession_id: 0,
    };
}

interface LgSeasSubCtx {
    league_id: number;
    season_id: number;
    subsession_id: number;
}

const lgSeasSubCtx: Ref<LgSeasSubCtx> =
    await asyncDataWithReactiveModel<LgSeasSubCtx>(
        `indexModel-${route.query.league}-${route.query.season}-${route.query.subsession}`,
        fetchModel,
        getDefaultModel,
        [route]
    );
</script>

<template>
    <header
        v-if="
            ['nextEventTimerEmbed', 'subsessionSummaryEmbed'].indexOf(
                route?.query?.m?.toString() || ''
            ) == -1
        "
        class="gh-header"
    >
        <div class="gh-header-inner">
            <div class="gh-header-left">
                <button
                    class="gh-mobile-toggle me-2 d-lg-none"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#navbarNav"
                    aria-controls="navbarNav"
                    aria-expanded="false"
                    aria-label="Toggle navigation"
                >
                    <span class="navbar-toggler-icon"></span>
                </button>

                <RouterLinkProxy class="gh-header-brand" to="/">
                    <img
                        class="icon"
                        v-bind:src="`blue-frog-racing-s4-icon.png`"
                    />
                    <span class="gh-header-brand-text">LEAP</span>
                </RouterLinkProxy>
            </div>

            <nav class="gh-header-nav collapse navbar-collapse" id="navbarNav">
                <RouterLinkProxy
                    class="gh-header-nav-link"
                    v-bind:to="`/?m=results&league=${lgSeasSubCtx.league_id}`"
                    >Results</RouterLinkProxy
                >
            </nav>

            <div class="gh-header-right">
                <SignedOut>
                    <SignInButton />
                </SignedOut>
                <SignedIn>
                    <IRIdentityCardLink />
                </SignedIn>
            </div>
        </div>
    </header>

    <div class="gh-page-container">
        <HomeView />
    </div>

    <footer class="gh-footer">
        <a
            href="https://www.bluefrogracing.com/"
            class="gh-footer-link"
            target="_blank"
            rel="noopener noreferrer"
            >Live Event Analysis and Performance by Blue Frog Racing.</a
        >
    </footer>
</template>

<style scoped>
/* ── GitHub-style Header ─────────────────────────────────────── */
.gh-header {
    background-color: var(--gh-header-bg);
    border-bottom: 1px solid var(--gh-header-border);
    padding: 0 var(--gh-spacing-md);
    height: 48px;
    display: flex;
    align-items: center;
    position: sticky;
    top: 0;
    z-index: 1030;
}

.gh-header-inner {
    display: flex;
    align-items: center;
    width: 100%;
    max-width: 1280px;
    margin: 0 auto;
    gap: var(--gh-spacing-md);
}

.gh-header-left {
    display: flex;
    align-items: center;
    gap: var(--gh-spacing-sm);
}

.gh-header-brand {
    display: flex;
    align-items: center;
    gap: var(--gh-spacing-sm);
    color: var(--gh-header-text);
    text-decoration: none;
    font-weight: 600;
    font-size: 1.1rem;
}

.gh-header-brand:hover {
    color: var(--gh-header-logo);
    text-decoration: none;
    opacity: 0.85;
}

.gh-header-brand-text {
    letter-spacing: 0.02em;
}

.icon {
    height: 1.6em;
    width: 1.6em;
    border-radius: var(--gh-radius-full);
}

.gh-header-nav {
    display: flex;
    align-items: center;
    gap: var(--gh-spacing-xs);
    flex: 1;
}

.gh-header-nav-link {
    color: var(--gh-fg-default);
    padding: 6px 12px;
    border-radius: var(--gh-radius-md);
    font-size: 0.875rem;
    font-weight: 500;
    text-decoration: none;
    transition: background-color 0.12s ease;
}

.gh-header-nav-link:hover {
    background-color: var(--gh-neutral-subtle);
    color: var(--gh-header-logo);
    text-decoration: none;
}

.gh-header-right {
    display: flex;
    align-items: center;
    gap: var(--gh-spacing-sm);
    margin-left: auto;
}

.gh-mobile-toggle {
    background: transparent;
    border: 1px solid var(--gh-border-default);
    border-radius: var(--gh-radius-md);
    padding: 4px 8px;
    color: var(--gh-fg-default);
}

/* ── Page Container ──────────────────────────────────────────── */
.gh-page-container {
    max-width: 1280px;
    margin: 0 auto;
    padding: var(--gh-spacing-md) var(--gh-spacing-md) 0;
}

/* ── Footer ──────────────────────────────────────────────────── */
.gh-footer {
    text-align: center;
    padding: var(--gh-spacing-lg) var(--gh-spacing-md);
    border-top: 1px solid var(--gh-border-default);
    margin-top: var(--gh-spacing-lg);
}

.gh-footer-link {
    color: var(--gh-fg-muted);
    font-size: 0.75rem;
}

.gh-footer-link:hover {
    color: var(--gh-accent-fg);
}
</style>
