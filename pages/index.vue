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
    <div
        v-if="
            ['nextEventTimerEmbed', 'subsessionSummaryEmbed'].indexOf(
                route?.query?.m?.toString() || ''
            ) == -1
        "
        class="gh-header-wrap"
    >
        <!-- ── Top bar: logo + brand + auth ────────────────────── -->
        <header class="gh-header">
            <div class="gh-header-inner">
                <RouterLinkProxy class="gh-header-brand" to="/">
                    <img
                        class="icon"
                        v-bind:src="`blue-frog-racing-s4-icon.png`"
                    />
                    <span class="gh-header-brand-sep">/</span>
                    <span class="gh-header-brand-text">LEAP</span>
                </RouterLinkProxy>

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

        <!-- ── Underline tab nav ───────────────────────────────── -->
        <nav class="gh-underline-nav">
            <div class="gh-underline-nav-inner">
                <RouterLinkProxy
                    class="gh-underline-nav-item"
                    v-bind:class="{
                        'gh-underline-nav-item--selected':
                            !route.query.m || route.query.m === 'season',
                    }"
                    to="/"
                >
                    <svg
                        class="gh-nav-icon"
                        viewBox="0 0 16 16"
                        width="16"
                        height="16"
                        fill="currentColor"
                    >
                        <path
                            d="M6.906.664a1.749 1.749 0 0 1 2.187 0l5.25 4.2c.415.332.657.835.657 1.367v7.019A1.75 1.75 0 0 1 13.25 15h-3.5a.75.75 0 0 1-.75-.75V9H7v5.25a.75.75 0 0 1-.75.75h-3.5A1.75 1.75 0 0 1 1 13.25V6.23c0-.531.242-1.034.657-1.366l5.25-4.2Z"
                        />
                    </svg>
                    <span>Home</span>
                </RouterLinkProxy>

                <RouterLinkProxy
                    class="gh-underline-nav-item"
                    v-bind:class="{
                        'gh-underline-nav-item--selected':
                            route.query.m === 'results',
                    }"
                    v-bind:to="`/?m=results&league=${lgSeasSubCtx.league_id}`"
                >
                    <svg
                        class="gh-nav-icon"
                        viewBox="0 0 16 16"
                        width="16"
                        height="16"
                        fill="currentColor"
                    >
                        <path
                            d="M1.5 1.75V13.5h13.75a.75.75 0 0 1 0 1.5H.75a.75.75 0 0 1-.75-.75V1.75a.75.75 0 0 1 1.5 0Zm14.28 2.53-5.25 5.25a.75.75 0 0 1-1.06 0L7 7.06 4.28 9.78a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l3.25-3.25a.75.75 0 0 1 1.06 0L10 7.94l4.72-4.72a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042Z"
                        />
                    </svg>
                    <span>Results</span>
                </RouterLinkProxy>

                <RouterLinkProxy
                    class="gh-underline-nav-item"
                    v-bind:class="{
                        'gh-underline-nav-item--selected':
                            route.query.m === 'standings',
                    }"
                    v-bind:to="`/?m=standings&league=${lgSeasSubCtx.league_id}`"
                >
                    <svg
                        class="gh-nav-icon"
                        viewBox="0 0 16 16"
                        width="16"
                        height="16"
                        fill="currentColor"
                    >
                        <path
                            d="M5.75 7.5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75Zm5.25-2.25a.75.75 0 0 0-1.5 0v4.5a.75.75 0 0 0 1.5 0v-4.5ZM8 6.5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-2.5A.75.75 0 0 1 8 6.5ZM1.5 0h13A1.5 1.5 0 0 1 16 1.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 14.5v-13A1.5 1.5 0 0 1 1.5 0Zm0 1.5v13h13v-13h-13Z"
                        />
                    </svg>
                    <span>Standings</span>
                </RouterLinkProxy>

                <SignedIn>
                    <RouterLinkProxy
                        class="gh-underline-nav-item"
                        v-bind:class="{
                            'gh-underline-nav-item--selected':
                                route.query.m === 'profile',
                        }"
                        to="/?m=profile"
                    >
                        <svg
                            class="gh-nav-icon"
                            viewBox="0 0 16 16"
                            width="16"
                            height="16"
                            fill="currentColor"
                        >
                            <path
                                d="M10.561 8.073a6.005 6.005 0 0 1 3.432 5.142.75.75 0 1 1-1.498.07 4.5 4.5 0 0 0-8.99 0 .75.75 0 0 1-1.498-.07 6.004 6.004 0 0 1 3.431-5.142 3.999 3.999 0 1 1 5.123 0ZM10.5 5a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z"
                            />
                        </svg>
                        <span>Profile</span>
                    </RouterLinkProxy>
                </SignedIn>
            </div>
        </nav>
    </div>

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
/* ══════════════════════════════════════════════════════════════════
   GitHub-style two-row header
   Row 1: logo / brand-name  ·····················  auth controls
   Row 2: underline tab nav  (Home · Results · Standings · Profile)
   ══════════════════════════════════════════════════════════════════ */

/* ── Sticky wrapper ──────────────────────────────────────────── */
.gh-header-wrap {
    position: sticky;
    top: 0;
    z-index: 1030;
    background-color: var(--gh-header-bg);
}

/* ── Row 1 — top bar ─────────────────────────────────────────── */
.gh-header {
    padding: 0 var(--gh-spacing-md);
    height: 48px;
    display: flex;
    align-items: center;
}

.gh-header-inner {
    display: flex;
    align-items: center;
    width: 100%;
    max-width: 1280px;
    margin: 0 auto;
    gap: var(--gh-spacing-md);
}

.gh-header-brand {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--gh-header-text);
    text-decoration: none !important;
    font-size: 1rem;
    white-space: nowrap;
    line-height: 1;
}

.gh-header-brand:hover {
    color: var(--gh-header-logo);
    opacity: 0.85;
}

.icon {
    height: 20px;
    width: 20px;
    border-radius: var(--gh-radius-full);
}

.gh-header-brand-sep {
    color: var(--gh-fg-subtle);
    font-weight: 300;
    font-size: 1.25rem;
}

.gh-header-brand-text {
    font-weight: 600;
}

.gh-header-right {
    display: flex;
    align-items: center;
    gap: var(--gh-spacing-sm);
    margin-left: auto;
    flex-shrink: 0;
}

/* ── Row 2 — underline tab nav ───────────────────────────────── */
.gh-underline-nav {
    border-bottom: 1px solid var(--gh-border-default);
    padding: 0 var(--gh-spacing-md);
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
}

/* hide scrollbar but keep scrollable */
.gh-underline-nav::-webkit-scrollbar {
    display: none;
}
.gh-underline-nav {
    -ms-overflow-style: none;
    scrollbar-width: none;
}

.gh-underline-nav-inner {
    display: flex;
    align-items: center;
    gap: 0;
    max-width: 1280px;
    margin: 0 auto;
}

.gh-underline-nav-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    font-size: 0.875rem;
    font-weight: 400;
    color: var(--gh-fg-muted);
    text-decoration: none !important;
    border-bottom: 2px solid transparent;
    white-space: nowrap;
    transition: color 0.12s ease, border-color 0.12s ease;
}

.gh-underline-nav-item:hover {
    color: var(--gh-fg-default);
    border-bottom-color: var(--gh-neutral-emphasis);
}

.gh-underline-nav-item--selected {
    font-weight: 600;
    color: var(--gh-fg-default);
    border-bottom-color: #f78166;
}

.gh-underline-nav-item--selected:hover {
    border-bottom-color: #f78166;
}

.gh-nav-icon {
    flex-shrink: 0;
    opacity: 0.7;
}

.gh-underline-nav-item--selected .gh-nav-icon {
    opacity: 1;
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
