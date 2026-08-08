/**
 * Telemetry wiring — boots the in-house analytics pipeline
 * (src/services/telemetry-service.ts) and hooks it into the app:
 *
 *  - session_start + initial page_view once the app mounts
 *  - page_view on every route change (the app routes via ?m=, so
 *    query-only navigations count)
 *  - identify when Clerk reports a signed-in user
 *  - error events from vue:error, window 'error', and
 *    'unhandledrejection'
 *  - page_load timing from the Navigation Timing API
 *  - flush on tab hide / page hide so closing the tab doesn't drop
 *    the queue
 *
 * Everything here is fire-and-forget: telemetry failures must never
 * surface to the user.
 */

import { watch } from 'vue';
import type { RouteLocationNormalizedLoaded } from 'vue-router';
import { useAuth } from 'vue-clerk';
import {
    initTelemetry,
    setTelemetryPage,
    trackSessionStart,
    trackPageView,
    trackError,
    trackTiming,
    identifyUser,
    flushTelemetry,
} from '@@/src/services/telemetry-service';
import { getAuthToken } from '@@/src/utils/api-client';
import type { TelemetryPageContext } from '@@/src/utils/telemetry-types';

const SCOPE_KEYS = [
    'league',
    'season',
    'subsession',
    'simsession',
    'driver',
    'team',
    'car',
    'track',
] as const;

function pageContextFromRoute(
    route: RouteLocationNormalizedLoaded
): TelemetryPageContext {
    // The app is a single query-routed page: `/` renders the mode in
    // `?m=`; real paths (/admin, /sign-in, …) are their own modes.
    const mode =
        route.path === '/'
            ? (route.query.m as string) || 'home'
            : route.path.replace(/^\//, '');
    const ctx: TelemetryPageContext = { mode, path: route.fullPath };
    for (const key of SCOPE_KEYS) {
        const v = route.query[key];
        if (typeof v === 'string' && v) ctx[key] = v;
    }
    return ctx;
}

export default defineNuxtPlugin((nuxtApp) => {
    initTelemetry({ getToken: getAuthToken });

    const router = useRouter();

    // Route changes → page views. Dedup on fullPath so redundant
    // afterEach firings (hash tweaks, replaceState churn) don't
    // double-count.
    let lastTrackedPath: string | null = null;
    let initialViewTracked = false;

    function trackRoute(route: RouteLocationNormalizedLoaded) {
        if (route.fullPath === lastTrackedPath) return;
        lastTrackedPath = route.fullPath;
        setTelemetryPage(pageContextFromRoute(route));
        trackPageView({ initial: !initialViewTracked });
        initialViewTracked = true;
    }

    nuxtApp.hook('app:mounted', () => {
        setTelemetryPage(pageContextFromRoute(router.currentRoute.value));
        trackSessionStart();
        trackRoute(router.currentRoute.value);

        // page_load timing — navigation entry duration is 0 until the
        // load event settles, so read it after 'load' (or now, if
        // already complete).
        const reportLoadTiming = () => {
            try {
                const [nav] = performance.getEntriesByType(
                    'navigation'
                ) as PerformanceNavigationTiming[];
                if (nav && nav.duration > 0) {
                    trackTiming('page_load', nav.duration);
                }
            } catch {
                // Navigation Timing unsupported — skip.
            }
        };
        if (document.readyState === 'complete') {
            reportLoadTiming();
        } else {
            window.addEventListener('load', reportLoadTiming, { once: true });
        }

        // Clerk hydrates after mount; runWithContext lets useAuth()
        // resolve its injections outside a component setup scope.
        try {
            nuxtApp.runWithContext(() => {
                const auth = useAuth();
                watch(
                    () => auth.userId?.value,
                    (userId) => {
                        if (userId) identifyUser(userId);
                    },
                    { immediate: true }
                );
            });
        } catch (e) {
            console.warn('[telemetry] auth identify wiring failed', e);
        }
    });

    router.afterEach((to) => {
        // Wait for mount so the initial SSR navigation isn't counted
        // twice (app:mounted handles the first view).
        if (initialViewTracked) trackRoute(to);
    });

    // Error capture — all three channels feed the same event shape.
    nuxtApp.hook('vue:error', (error) => {
        const err = error as Error;
        trackError('vue', err?.message || String(error), err?.stack);
    });
    window.addEventListener('error', (e) => {
        trackError('window', e.message || 'unknown error', e.error?.stack);
    });
    window.addEventListener('unhandledrejection', (e) => {
        const reason = e.reason as Error | undefined;
        trackError(
            'unhandledrejection',
            reason?.message || String(e.reason ?? 'unhandled rejection'),
            reason?.stack
        );
    });

    // Flush before the tab goes away. 'visibilitychange' → hidden is
    // the most reliable end-of-session signal on mobile; 'pagehide'
    // covers desktop unloads.
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            void flushTelemetry({ useBeacon: true });
        }
    });
    window.addEventListener('pagehide', () => {
        void flushTelemetry({ useBeacon: true });
    });
});
