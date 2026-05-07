<script setup lang="ts">
import { ref, computed, watch, watchEffect } from 'vue';
import { RouterLink, RouterView } from 'vue-router';
import { useRoute } from 'vue-router';
import { SignedIn, SignedOut, SignInButton } from 'vue-clerk';
import IRIdentityCardLink from '@@/src/components/user/ir-identity-card-link.vue';
import { useAuth } from 'vue-clerk';
import { getUserLeaguesState } from '@@/src/utils/fetch-util';
import { getUserFeatures } from '@@/src/services/user-service';
import type { Ref } from 'vue';
import {
    preFetch,
    defLgSeasSubCtx,
    setAuth,
    setToken,
} from '@@/src/utils/fetch-util';
import RouterLinkProxy from '@@/src/components/nav/router-link-proxy.vue';
import LeagueSeasonChip from '@@/src/components/nav/league-season-chip.vue';
import TrackStatsChip from '@@/src/components/nav/track-stats-chip.vue';
import ResultsScopeChip from '@@/src/components/nav/results-scope-chip.vue';
import { selectChip } from '@@/src/utils/scope-chip-selector';
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

const userFeatures: Ref<string[]> = ref([]);
const isGlobalAdmin = computed(() =>
    userFeatures.value.includes('global_admin')
);

if (import.meta.client) {
    watchEffect(async () => {
        if (auth?.isSignedIn?.value === true) {
            try {
                userFeatures.value = await getUserFeatures();
            } catch (e) {
                console.warn('[index] failed to load user features', e);
            }
        } else {
            userFeatures.value = [];
        }
    });
}

async function fetchModel() {
    const def = await defLgSeasSubCtx(
        route.query.league as string,
        route.query.season as string,
        route.query.subsession as string
    );
    // defLgSeasSubCtx doesn't carry simsession; mirror HomeView's
    // pattern of grafting it on from route.query so the header chip
    // can read it without going to route directly.
    if (def) {
        const sim = route.query.simsession as string | undefined;
        (def as { simsession_id?: number | string }).simsession_id = sim
            ? Number(sim)
            : 0;
    }
    return def;
}

function getDefaultModel() {
    return {
        league_id: 0,
        season_id: 0,
        subsession_id: 0,
        simsession_id: 0,
    };
}

interface LgSeasSubCtx {
    league_id: number;
    season_id: number;
    subsession_id: number;
    simsession_id: number;
}

const lgSeasSubCtx: Ref<LgSeasSubCtx> =
    await asyncDataWithReactiveModel<LgSeasSubCtx>(
        `indexModel-${route.query.league}-${route.query.season}-${route.query.subsession}-${route.query.simsession || ''}`,
        fetchModel,
        getDefaultModel,
        [route]
    );

const runtimeConfig = useRuntimeConfig();
const buildSha = computed(() =>
    (runtimeConfig.public.BUILD_COMMIT_SHA as string) || 'dev'
);
const buildShortSha = computed(() => buildSha.value.slice(0, 7));
const buildDate = computed(() => {
    const t = runtimeConfig.public.BUILD_TIME as string | undefined;
    return t ? t.slice(0, 10) : '';
});

const headerChip = computed(() =>
    selectChip(
        {
            m: route.query.m as string | undefined,
            car: route.query.car as string | undefined,
            track: route.query.track as string | undefined,
        },
        {
            league_id: lgSeasSubCtx.value.league_id,
            season_id: lgSeasSubCtx.value.season_id,
        }
    )
);

const isEmbedMode = computed(() =>
    ['nextEventTimerEmbed', 'subsessionSummaryEmbed'].includes(
        (route.query.m as string) || ''
    )
);
</script>

<template>
    <div
        v-if="
            ['nextEventTimerEmbed', 'subsessionSummaryEmbed'].indexOf(
                route?.query?.m?.toString() || ''
            ) == -1
        "
    >
        <!-- ── Single-row top header ───────────────────────────── -->
        <header class="app-header">
            <div class="app-header__inner">
                <RouterLinkProxy class="app-header__brand" to="/">
                    <img
                        class="app-header__icon"
                        v-bind:src="`blue-frog-racing-s4-icon.png`"
                    />
                    <span class="app-header__brand-sep">/</span>
                    <span class="app-header__brand-text">LEAP</span>
                </RouterLinkProxy>

                <ResultsScopeChip
                    v-if="headerChip === 'results'"
                    :key="`results-chip-${lgSeasSubCtx.league_id}-${lgSeasSubCtx.season_id || 0}-${lgSeasSubCtx.subsession_id || 0}-${lgSeasSubCtx.simsession_id || 0}`"
                    v-bind:league="lgSeasSubCtx.league_id.toString()"
                    v-bind:season="(lgSeasSubCtx.season_id || 0).toString()"
                    v-bind:subsession="
                        (lgSeasSubCtx.subsession_id || 0).toString()
                    "
                    v-bind:simsession="
                        (lgSeasSubCtx.simsession_id || 0).toString()
                    "
                />
                <TrackStatsChip
                    v-else-if="
                        headerChip === 'track' &&
                        route.query.league &&
                        route.query.car &&
                        route.query.track
                    "
                    :key="`track-chip-${route.query.league}-${route.query.car}-${route.query.track}`"
                    v-bind:league="route.query.league.toString()"
                    v-bind:car="route.query.car.toString()"
                    v-bind:track="route.query.track.toString()"
                />
                <LeagueSeasonChip
                    v-else-if="headerChip === 'league-season'"
                    :key="`chip-${lgSeasSubCtx.league_id}-${lgSeasSubCtx.season_id}-${route.query.m || ''}`"
                    v-bind:league="lgSeasSubCtx.league_id.toString()"
                    v-bind:season="lgSeasSubCtx.season_id.toString()"
                    v-bind:target-page="(route.query.m as string) || ''"
                />

                <!-- Desktop tabs — hidden on mobile, where the bottom
                     bar takes over primary navigation. -->
                <nav class="app-header__tabs">
                    <RouterLinkProxy
                        class="app-header__tab"
                        v-bind:class="{
                            'app-header__tab--active':
                                !route.query.m || route.query.m === 'season',
                        }"
                        to="/"
                    >
                        <svg
                            class="app-header__tab-icon"
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
                        class="app-header__tab"
                        v-bind:class="{
                            'app-header__tab--active':
                                route.query.m === 'results',
                        }"
                        v-bind:to="`/?m=results&league=${lgSeasSubCtx.league_id}`"
                    >
                        <svg
                            class="app-header__tab-icon"
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
                        class="app-header__tab"
                        v-bind:class="{
                            'app-header__tab--active':
                                route.query.m === 'standings',
                        }"
                        v-bind:to="`/?m=standings&league=${lgSeasSubCtx.league_id}`"
                    >
                        <svg
                            class="app-header__tab-icon"
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

                    <RouterLinkProxy
                        class="app-header__tab"
                        v-bind:class="{
                            'app-header__tab--active':
                                route.query.m === 'rulings',
                        }"
                        v-bind:to="`/?m=rulings&league=${lgSeasSubCtx.league_id}`"
                    >
                        <svg
                            class="app-header__tab-icon"
                            viewBox="0 0 16 16"
                            width="16"
                            height="16"
                            fill="currentColor"
                        >
                            <path
                                d="M8.75.75V2h.985c.304 0 .603.08.867.231l1.29.736c.038.022.08.033.124.033h2.234a.75.75 0 0 1 0 1.5h-.427l2.111 4.692a.75.75 0 0 1-.154.838l-.53-.53.529.531-.001.002-.002.002-.006.006-.006.005-.01.01-.045.04q-.04.034-.116.094c-.1.078-.249.183-.444.287-.394.21-.97.417-1.74.417s-1.346-.207-1.74-.417a3.5 3.5 0 0 1-.444-.287 2 2 0 0 1-.158-.132l-.026-.025-.006-.006-.002-.002-.001-.002.529-.531-.531.529a.75.75 0 0 1-.154-.838L13.481 4.5H13.06a1.75 1.75 0 0 1-.875-.234l-1.29-.736a.25.25 0 0 0-.124-.03h-.985V13.5H14a.75.75 0 0 1 0 1.5H2a.75.75 0 0 1 0-1.5h3.25V3.5h-.984a.25.25 0 0 0-.124.033l-1.289.737c-.265.15-.564.23-.869.23h-.422l2.112 4.692a.75.75 0 0 1-.154.838l-.53-.53.529.531-.001.002-.002.002-.006.006-.016.015-.045.04q-.04.034-.116.094c-.1.078-.249.183-.444.287-.394.21-.97.417-1.74.417s-1.346-.207-1.74-.417a3.5 3.5 0 0 1-.444-.287 2 2 0 0 1-.158-.132l-.026-.025-.006-.006-.002-.002-.001-.002.529-.531-.531.529a.75.75 0 0 1-.154-.838L2.518 4.5h-.421a.75.75 0 0 1 0-1.5h2.234a.25.25 0 0 0 .124-.033l1.29-.736c.264-.151.563-.231.867-.231h.984V.75a.75.75 0 0 1 1.5 0Zm2.945 8.477c.285.135.718.273 1.305.273s1.02-.138 1.305-.273L13 6.327Zm-10 0c.285.135.718.273 1.305.273s1.02-.138 1.305-.273L3 6.327Z"
                            />
                        </svg>
                        <span>Rulings</span>
                    </RouterLinkProxy>

                    <SignedIn>
                        <RouterLinkProxy
                            class="app-header__tab"
                            v-bind:class="{
                                'app-header__tab--active':
                                    route.query.m === 'profile',
                            }"
                            to="/?m=profile"
                        >
                            <svg
                                class="app-header__tab-icon"
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

                        <RouterLinkProxy
                            v-if="isGlobalAdmin"
                            class="app-header__tab"
                            to="/admin"
                        >
                            <svg
                                class="app-header__tab-icon"
                                viewBox="0 0 16 16"
                                width="16"
                                height="16"
                                fill="currentColor"
                            >
                                <path
                                    d="M7.467.133a1.75 1.75 0 0 1 1.066 0l5.25 1.68A1.75 1.75 0 0 1 15 3.48V7c0 1.566-.32 3.182-1.303 4.682-.983 1.498-2.585 2.813-5.032 3.855a1.7 1.7 0 0 1-1.33 0c-2.447-1.042-4.049-2.357-5.032-3.855C1.32 10.182 1 8.566 1 7V3.48a1.75 1.75 0 0 1 1.217-1.667Zm.61 1.429a.25.25 0 0 0-.153 0l-5.25 1.68a.25.25 0 0 0-.174.238V7c0 1.358.275 2.666 1.057 3.86.784 1.194 2.121 2.34 4.366 3.297a.2.2 0 0 0 .154 0c2.245-.957 3.582-2.103 4.366-3.297C13.225 9.666 13.5 8.358 13.5 7V3.48a.25.25 0 0 0-.174-.237l-5.25-1.68ZM8 4.25a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0V5A.75.75 0 0 1 8 4.25Zm0 6.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"
                                />
                            </svg>
                            <span>Admin</span>
                        </RouterLinkProxy>
                    </SignedIn>
                </nav>

                <div class="app-header__user">
                    <SignedOut>
                        <SignInButton>
                            <button class="icon-btn" aria-label="Sign in">
                                <svg
                                    viewBox="0 0 16 16"
                                    width="18"
                                    height="18"
                                    fill="currentColor"
                                    aria-hidden="true"
                                >
                                    <path
                                        d="M2 2.75A2.75 2.75 0 0 1 4.75 0h7.5A2.75 2.75 0 0 1 15 2.75v10.5A2.75 2.75 0 0 1 12.25 16h-7.5a.75.75 0 0 1 0-1.5h7.5c.69 0 1.25-.56 1.25-1.25V2.75c0-.69-.56-1.25-1.25-1.25h-7.5c-.69 0-1.25.56-1.25 1.25v10.5a.75.75 0 0 1-1.5 0V2.75Z"
                                    />
                                    <path
                                        d="M9.78 8.53a.75.75 0 0 0 0-1.06L7.06 4.75a.751.751 0 0 0-1.042.018.751.751 0 0 0-.018 1.042l1.47 1.47H1.75a.75.75 0 0 0 0 1.5h5.72L6 10.25a.751.751 0 0 0 .018 1.042.751.751 0 0 0 1.042.018L9.78 8.53Z"
                                    />
                                </svg>
                            </button>
                        </SignInButton>
                    </SignedOut>
                    <SignedIn>
                        <IRIdentityCardLink />
                    </SignedIn>
                </div>
            </div>
        </header>

        <!-- ── Mobile bottom tab bar ────────────────────────────── -->
        <nav class="bottom-nav" aria-label="Primary">
            <RouterLinkProxy
                class="bottom-nav__item"
                v-bind:class="{
                    'bottom-nav__item--active':
                        !route.query.m || route.query.m === 'season',
                }"
                to="/"
            >
                <svg
                    class="bottom-nav__icon"
                    viewBox="0 0 16 16"
                    width="22"
                    height="22"
                    fill="currentColor"
                >
                    <path
                        d="M6.906.664a1.749 1.749 0 0 1 2.187 0l5.25 4.2c.415.332.657.835.657 1.367v7.019A1.75 1.75 0 0 1 13.25 15h-3.5a.75.75 0 0 1-.75-.75V9H7v5.25a.75.75 0 0 1-.75.75h-3.5A1.75 1.75 0 0 1 1 13.25V6.23c0-.531.242-1.034.657-1.366l5.25-4.2Z"
                    />
                </svg>
                <span class="bottom-nav__label">Home</span>
            </RouterLinkProxy>

            <RouterLinkProxy
                class="bottom-nav__item"
                v-bind:class="{
                    'bottom-nav__item--active': route.query.m === 'results',
                }"
                v-bind:to="`/?m=results&league=${lgSeasSubCtx.league_id}`"
            >
                <svg
                    class="bottom-nav__icon"
                    viewBox="0 0 16 16"
                    width="22"
                    height="22"
                    fill="currentColor"
                >
                    <path
                        d="M1.5 1.75V13.5h13.75a.75.75 0 0 1 0 1.5H.75a.75.75 0 0 1-.75-.75V1.75a.75.75 0 0 1 1.5 0Zm14.28 2.53-5.25 5.25a.75.75 0 0 1-1.06 0L7 7.06 4.28 9.78a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l3.25-3.25a.75.75 0 0 1 1.06 0L10 7.94l4.72-4.72a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042Z"
                    />
                </svg>
                <span class="bottom-nav__label">Results</span>
            </RouterLinkProxy>

            <RouterLinkProxy
                class="bottom-nav__item"
                v-bind:class="{
                    'bottom-nav__item--active': route.query.m === 'standings',
                }"
                v-bind:to="`/?m=standings&league=${lgSeasSubCtx.league_id}`"
            >
                <svg
                    class="bottom-nav__icon"
                    viewBox="0 0 16 16"
                    width="22"
                    height="22"
                    fill="currentColor"
                >
                    <path
                        d="M5.75 7.5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75Zm5.25-2.25a.75.75 0 0 0-1.5 0v4.5a.75.75 0 0 0 1.5 0v-4.5ZM8 6.5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-2.5A.75.75 0 0 1 8 6.5ZM1.5 0h13A1.5 1.5 0 0 1 16 1.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 14.5v-13A1.5 1.5 0 0 1 1.5 0Zm0 1.5v13h13v-13h-13Z"
                    />
                </svg>
                <span class="bottom-nav__label">Standings</span>
            </RouterLinkProxy>

            <RouterLinkProxy
                class="bottom-nav__item"
                v-bind:class="{
                    'bottom-nav__item--active': route.query.m === 'rulings',
                }"
                v-bind:to="`/?m=rulings&league=${lgSeasSubCtx.league_id}`"
            >
                <svg
                    class="bottom-nav__icon"
                    viewBox="0 0 16 16"
                    width="22"
                    height="22"
                    fill="currentColor"
                >
                    <path
                        d="M8.75.75V2h.985c.304 0 .603.08.867.231l1.29.736c.038.022.08.033.124.033h2.234a.75.75 0 0 1 0 1.5h-.427l2.111 4.692a.75.75 0 0 1-.154.838l-.53-.53.529.531-.001.002-.002.002-.006.006-.006.005-.01.01-.045.04q-.04.034-.116.094c-.1.078-.249.183-.444.287-.394.21-.97.417-1.74.417s-1.346-.207-1.74-.417a3.5 3.5 0 0 1-.444-.287 2 2 0 0 1-.158-.132l-.026-.025-.006-.006-.002-.002-.001-.002.529-.531-.531.529a.75.75 0 0 1-.154-.838L13.481 4.5H13.06a1.75 1.75 0 0 1-.875-.234l-1.29-.736a.25.25 0 0 0-.124-.03h-.985V13.5H14a.75.75 0 0 1 0 1.5H2a.75.75 0 0 1 0-1.5h3.25V3.5h-.984a.25.25 0 0 0-.124.033l-1.289.737c-.265.15-.564.23-.869.23h-.422l2.112 4.692a.75.75 0 0 1-.154.838l-.53-.53.529.531-.001.002-.002.002-.006.006-.016.015-.045.04q-.04.034-.116.094c-.1.078-.249.183-.444.287-.394.21-.97.417-1.74.417s-1.346-.207-1.74-.417a3.5 3.5 0 0 1-.444-.287 2 2 0 0 1-.158-.132l-.026-.025-.006-.006-.002-.002-.001-.002.529-.531-.531.529a.75.75 0 0 1-.154-.838L2.518 4.5h-.421a.75.75 0 0 1 0-1.5h2.234a.25.25 0 0 0 .124-.033l1.29-.736c.264-.151.563-.231.867-.231h.984V.75a.75.75 0 0 1 1.5 0Zm2.945 8.477c.285.135.718.273 1.305.273s1.02-.138 1.305-.273L13 6.327Zm-10 0c.285.135.718.273 1.305.273s1.02-.138 1.305-.273L3 6.327Z"
                    />
                </svg>
                <span class="bottom-nav__label">Rulings</span>
            </RouterLinkProxy>

            <SignedIn>
                <RouterLinkProxy
                    v-if="isGlobalAdmin"
                    class="bottom-nav__item"
                    v-bind:class="{
                        'bottom-nav__item--active': route.path === '/admin',
                    }"
                    to="/admin"
                >
                    <svg
                        class="bottom-nav__icon"
                        viewBox="0 0 16 16"
                        width="22"
                        height="22"
                        fill="currentColor"
                    >
                        <path
                            d="M7.467.133a1.75 1.75 0 0 1 1.066 0l5.25 1.68A1.75 1.75 0 0 1 15 3.48V7c0 1.566-.32 3.182-1.303 4.682-.983 1.498-2.585 2.813-5.032 3.855a1.7 1.7 0 0 1-1.33 0c-2.447-1.042-4.049-2.357-5.032-3.855C1.32 10.182 1 8.566 1 7V3.48a1.75 1.75 0 0 1 1.217-1.667Zm.61 1.429a.25.25 0 0 0-.153 0l-5.25 1.68a.25.25 0 0 0-.174.238V7c0 1.358.275 2.666 1.057 3.86.784 1.194 2.121 2.34 4.366 3.297a.2.2 0 0 0 .154 0c2.245-.957 3.582-2.103 4.366-3.297C13.225 9.666 13.5 8.358 13.5 7V3.48a.25.25 0 0 0-.174-.237l-5.25-1.68ZM8 4.25a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0V5A.75.75 0 0 1 8 4.25Zm0 6.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"
                        />
                    </svg>
                    <span class="bottom-nav__label">Admin</span>
                </RouterLinkProxy>
            </SignedIn>
        </nav>
    </div>

    <main class="app-main" v-bind:class="{ 'app-main--embed': isEmbedMode }">
        <HomeView />
    </main>

    <footer v-if="!isEmbedMode" class="gh-footer">
        <a
            href="https://www.bluefrogracing.com/"
            class="gh-footer-link"
            target="_blank"
            rel="noopener noreferrer"
            >Live Event Analysis and Performance by Blue Frog Racing.</a
        >
        <a
            v-if="buildSha !== 'dev'"
            class="gh-footer-build"
            v-bind:href="`https://github.com/bfr-leap/wbapp-leapfe/commit/${buildSha}`"
            target="_blank"
            rel="noopener noreferrer"
            >build {{ buildShortSha
            }}<span v-if="buildDate"> · {{ buildDate }}</span></a
        >
        <span v-else class="gh-footer-build">build dev</span>
    </footer>
</template>

<style scoped>
/* ══════════════════════════════════════════════════════════════════
   App chrome
     · Single-row sticky top header with brand + (desktop) tabs + user.
     · Mobile: primary nav lives in a fixed bottom tab bar; top tabs
       are hidden. Both bars use a translucent surface with backdrop
       blur (iOS-style) so content scrolling beneath shows through.
     · Safe-area insets respected for notch / home-indicator devices.
   ══════════════════════════════════════════════════════════════════ */

.app-header {
    position: sticky;
    top: 0;
    z-index: var(--z-header);
    background: rgba(11, 13, 16, 0.78);
    backdrop-filter: saturate(140%) blur(20px);
    -webkit-backdrop-filter: saturate(140%) blur(20px);
    border-bottom: var(--rule);
    padding-top: env(safe-area-inset-top);
}

.app-header__inner {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    height: var(--header-h);
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 var(--gutter-page);
    /* Safety net: at narrow desktop widths the chip bar + tab
       strip could compete for space and overlap. min-width:0
       lets flex children actually shrink instead of pushing
       past the container edge. */
    min-width: 0;
    overflow: hidden;
}
@media (min-width: 768px) {
    .app-header__inner {
        padding: 0 var(--gutter-page-md);
    }
}

.app-header__inner :deep(.app-header__brand) {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--text-primary);
    text-decoration: none !important;
    font-size: var(--text-base);
    white-space: nowrap;
    line-height: 1;
    flex-shrink: 0;
}

.app-header__icon {
    width: 24px;
    height: 24px;
    border-radius: 999px;
}
.app-header__brand-sep {
    color: var(--text-muted);
    font-weight: 300;
    font-size: 1.25rem;
}
.app-header__brand-text {
    font-weight: 600;
    letter-spacing: -0.01em;
}

/* Desktop tabs — hidden on mobile, the bottom bar takes over there. */
.app-header__tabs {
    display: none;
}
@media (min-width: 768px) {
    .app-header__tabs {
        display: flex;
        align-items: center;
        gap: var(--space-1);
        margin-left: var(--space-4);
        flex: 1;
    }
}

.app-header__inner :deep(.app-header__tab) {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    color: var(--text-secondary);
    text-decoration: none !important;
    font-size: var(--text-sm);
    font-weight: 500;
    border-radius: var(--radius-sm);
    transition: color var(--duration-fast) var(--easing-out),
        background-color var(--duration-fast) var(--easing-out);
    white-space: nowrap;
}
.app-header__inner :deep(.app-header__tab:hover) {
    color: var(--text-primary);
    background: var(--surface-3);
}
.app-header__inner :deep(.app-header__tab--active) {
    color: var(--text-primary);
    background: var(--surface-2);
    box-shadow: inset 0 -2px 0 var(--accent);
}
.app-header__tab-icon {
    flex-shrink: 0;
    opacity: 0.85;
}

.app-header__user {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-shrink: 0;
}

/* ── Mobile bottom tab bar ───────────────────────────────────── */
.bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: var(--z-bottom-nav);
    display: flex;
    background: rgba(11, 13, 16, 0.78);
    backdrop-filter: saturate(140%) blur(20px);
    -webkit-backdrop-filter: saturate(140%) blur(20px);
    border-top: var(--rule);
    padding-bottom: env(safe-area-inset-bottom);
}
@media (min-width: 768px) {
    .bottom-nav {
        display: none;
    }
}

.bottom-nav :deep(.bottom-nav__item) {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding: var(--space-1) 0;
    color: var(--text-secondary);
    text-decoration: none !important;
    min-height: var(--bottom-nav-h);
    transition: color var(--duration-fast) var(--easing-out);
}
.bottom-nav :deep(.bottom-nav__item:hover) {
    color: var(--text-primary);
}
.bottom-nav :deep(.bottom-nav__item--active) {
    color: var(--text-primary);
    box-shadow: inset 0 2px 0 var(--accent);
}
.bottom-nav__icon {
    flex-shrink: 0;
    opacity: 0.85;
}
.bottom-nav :deep(.bottom-nav__item--active) .bottom-nav__icon {
    opacity: 1;
}
.bottom-nav__label {
    font-size: 0.6875rem;
    font-weight: 500;
    line-height: 1;
    letter-spacing: 0.01em;
}
.bottom-nav :deep(.bottom-nav__item--active) .bottom-nav__label {
    font-weight: 600;
}

/* ── Page main ───────────────────────────────────────────────── */
.app-main {
    max-width: 1280px;
    margin: 0 auto;
    padding-bottom: calc(var(--bottom-nav-h) + env(safe-area-inset-bottom));
}
@media (min-width: 768px) {
    .app-main {
        padding-bottom: 0;
    }
}

/* Embed mode: no chrome, no footer, no reserved bottom space.
   The embed renders flush to the iframe edges. */
.app-main--embed {
    padding-bottom: 0;
    max-width: none;
}

/* ── Footer ──────────────────────────────────────────────────── */
.gh-footer {
    text-align: center;
    padding: var(--space-5) var(--gutter-page);
    border-top: var(--rule);
    margin-top: var(--space-6);
}

.gh-footer-link {
    color: var(--text-muted);
    font-size: var(--text-xs);
    text-decoration: none;
}
.gh-footer-link:hover {
    color: var(--text-secondary);
}

.gh-footer-build {
    display: block;
    margin-top: var(--space-1);
    font-family: var(--font-mono);
    font-size: 0.6875rem;
    color: var(--text-disabled);
    letter-spacing: 0.02em;
    text-decoration: none;
}
.gh-footer-build:hover {
    color: var(--text-muted);
}
</style>
