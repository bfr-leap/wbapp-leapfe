/**
 * Telemetry service — the client SDK for the in-house analytics
 * pipeline that replaced Mixpanel.
 *
 * Components and plugins call the `track*` helpers; events are
 * batched in memory and POSTed to `/api/telemetry/events` (see
 * src/utils/telemetry-types.ts for the wire contract). Batches flush
 * on a timer, when the queue fills, and on page hide via
 * `fetch(keepalive)` / `sendBeacon` so tab closes don't drop events.
 *
 * Guarantees:
 *  - Never throws and never rejects — analytics must not break the app.
 *  - No-op during SSR and before `initTelemetry()` runs.
 *  - No PII beyond what's explicitly passed to `identifyUser()`.
 */

import type {
    TelemetryEvent,
    TelemetryEventName,
    TelemetryPageContext,
    TelemetryBatchRequest,
} from '@@/src/utils/telemetry-types';

const ENDPOINT = '/api/telemetry/events';
const DEVICE_ID_KEY = 'leap.telemetry.deviceId';
const SESSION_ID_KEY = 'leap.telemetry.sessionId';
const MAX_QUEUE = 20;
const FLUSH_INTERVAL_MS = 10_000;
const MAX_STACK_CHARS = 4000;

interface TelemetryState {
    deviceId: string;
    sessionId: string;
    seq: number;
    queue: TelemetryEvent[];
    flushTimer: ReturnType<typeof setInterval> | null;
    page: TelemetryPageContext | null;
    getToken: (() => Promise<string | null>) | null;
    enabled: boolean;
}

let _state: TelemetryState | null = null;

function randomId(): string {
    try {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
    } catch {
        // fall through to the non-crypto path
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function persistentId(storage: Storage | undefined, key: string): string {
    try {
        if (!storage) return randomId();
        let id = storage.getItem(key);
        if (!id) {
            id = randomId();
            storage.setItem(key, id);
        }
        return id;
    } catch {
        // Storage can throw in private browsing / blocked-cookie modes.
        return randomId();
    }
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export interface InitTelemetryOptions {
    /** Auth token supplier for regular flushes; page-hide flushes go
     *  unauthenticated because token retrieval is async. */
    getToken?: () => Promise<string | null>;
}

/**
 * Initialize the client pipeline. Idempotent; safe to call from a
 * plugin on every boot. Emits nothing itself — callers emit
 * `session_start` / `page_view` as appropriate.
 */
export function initTelemetry(opts: InitTelemetryOptions = {}): void {
    if (import.meta.server) return;
    if (_state) return;
    _state = {
        deviceId: persistentId(
            typeof localStorage === 'undefined' ? undefined : localStorage,
            DEVICE_ID_KEY
        ),
        sessionId: persistentId(
            typeof sessionStorage === 'undefined' ? undefined : sessionStorage,
            SESSION_ID_KEY
        ),
        seq: 0,
        queue: [],
        flushTimer: setInterval(() => {
            void flushTelemetry();
        }, FLUSH_INTERVAL_MS),
        page: null,
        getToken: opts.getToken ?? null,
        enabled: true,
    };
}

/** Current page context, applied to every subsequent event. The
 *  router plugin calls this on navigation before `trackPageView`. */
export function setTelemetryPage(page: TelemetryPageContext): void {
    if (!_state) return;
    _state.page = page;
}

// ---------------------------------------------------------------------------
// Emit helpers
// ---------------------------------------------------------------------------

function enqueue(
    event: TelemetryEventName,
    props: Record<string, unknown>
): void {
    const s = _state;
    if (!s || !s.enabled) return;
    try {
        s.seq += 1;
        s.queue.push({
            event,
            ts: Date.now(),
            seq: s.seq,
            deviceId: s.deviceId,
            sessionId: s.sessionId,
            page: s.page ?? undefined,
            props,
        } as TelemetryEvent);
        if (s.queue.length >= MAX_QUEUE) {
            void flushTelemetry();
        }
    } catch {
        // Swallow — telemetry must never break the caller.
    }
}

export function trackSessionStart(): void {
    if (!_state) return;
    try {
        enqueue('session_start', {
            referrer: document.referrer || '',
            viewportW: window.innerWidth,
            viewportH: window.innerHeight,
            screenW: window.screen?.width ?? 0,
            screenH: window.screen?.height ?? 0,
            language: navigator.language || '',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
        });
    } catch {
        // ignore — environment probes can throw in exotic embeds
    }
}

export function trackPageView(opts: { initial: boolean }): void {
    enqueue('page_view', {
        initial: opts.initial,
        referrer:
            typeof document === 'undefined' ? '' : document.referrer || '',
    });
}

export function trackUiEvent(
    component: string,
    action: string,
    label?: string,
    value?: number
): void {
    enqueue('ui_interaction', {
        component,
        action,
        ...(label !== undefined ? { label } : {}),
        ...(value !== undefined ? { value } : {}),
    });
}

export function trackError(
    source: 'vue' | 'window' | 'unhandledrejection',
    message: string,
    stack?: string
): void {
    if (!message) return;
    enqueue('error', {
        source,
        message: message.slice(0, 1000),
        ...(stack ? { stack: stack.slice(0, MAX_STACK_CHARS) } : {}),
    });
}

export function trackTiming(
    metric: string,
    durationMs: number,
    label?: string
): void {
    if (!Number.isFinite(durationMs) || durationMs < 0) return;
    enqueue('timing', {
        metric,
        durationMs: Math.round(durationMs),
        ...(label !== undefined ? { label } : {}),
    });
}

export function identifyUser(userId: string): void {
    if (!userId) return;
    enqueue('identify', { userId });
}

// ---------------------------------------------------------------------------
// Flush
// ---------------------------------------------------------------------------

/**
 * Send everything queued. `useBeacon` is the page-hide path: it must
 * be synchronous-ish, so it skips auth and prefers `sendBeacon`.
 * Failed batches are put back on the queue (bounded) so a transient
 * network blip doesn't drop events; the flush timer retries them.
 */
export async function flushTelemetry(
    opts: { useBeacon?: boolean } = {}
): Promise<void> {
    const s = _state;
    if (!s || s.queue.length === 0) return;

    const events = s.queue.splice(0, s.queue.length);
    const body: TelemetryBatchRequest = { sentAt: Date.now(), events };
    const json = JSON.stringify(body);

    try {
        if (opts.useBeacon && typeof navigator !== 'undefined') {
            if (
                navigator.sendBeacon?.(
                    ENDPOINT,
                    new Blob([json], { type: 'application/json' })
                )
            ) {
                return;
            }
            // Beacon refused (payload too big / unsupported) — fall
            // through to keepalive fetch.
        }

        let token: string | null = null;
        if (!opts.useBeacon && s.getToken) {
            token = await s.getToken().catch(() => null);
        }

        const res = await fetch(ENDPOINT, {
            method: 'POST',
            keepalive: true,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: json,
        });
        if (!res.ok && res.status >= 500) {
            requeue(s, events);
        }
    } catch {
        requeue(s, events);
    }
}

function requeue(s: TelemetryState, events: TelemetryEvent[]): void {
    // Put failed events back at the front (original order) so the
    // next timer tick retries them. The cap bounds memory during an
    // outage — oldest events win, newest get dropped.
    s.queue = [...events, ...s.queue].slice(0, MAX_QUEUE * 2);
}

// ---------------------------------------------------------------------------
// Test hooks
// ---------------------------------------------------------------------------

/** Exposed for unit tests — tears down module state. */
export function _resetTelemetryForTests(): void {
    if (_state?.flushTimer) clearInterval(_state.flushTimer);
    _state = null;
}

/** Exposed for unit tests — inspect the pending queue. */
export function _telemetryQueueForTests(): TelemetryEvent[] {
    return _state ? [..._state.queue] : [];
}
