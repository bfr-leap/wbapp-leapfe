/**
 * Telemetry event shapes — shared by the client SDK
 * (src/services/telemetry-service.ts) and the ingest endpoint
 * (server/api/telemetry/events.post.ts).
 *
 * This is the contract the external telemetry service will consume
 * once ingest delegates to it (same pattern as data lake access), so
 * shapes here should stay additive: new event names and optional
 * props are fine, renames and removals are breaking.
 *
 * Design notes:
 *  - Every event carries the same envelope (ids, sequence, timestamp,
 *    page context) so the backend can order and sessionize without
 *    per-event special cases.
 *  - `deviceId` is an anonymous random id persisted in localStorage;
 *    `sessionId` is per-tab (sessionStorage). Linking either to a real
 *    user only happens through an explicit `identify` event after
 *    sign-in.
 *  - Validation lives here (not in the endpoint) so both sides can
 *    unit-test the contract without booting Nitro.
 */

// ---------------------------------------------------------------------------
// Envelope
// ---------------------------------------------------------------------------

export const TELEMETRY_EVENT_NAMES = [
    'session_start',
    'page_view',
    'ui_interaction',
    'error',
    'timing',
    'identify',
] as const;

export type TelemetryEventName = typeof TELEMETRY_EVENT_NAMES[number];

/**
 * Where an event happened. Mirrors the app's query-param routing:
 * `mode` is `route.query.m` (or `'home'` for the bare index), and the
 * scope params echo the query string so events can be grouped by
 * league/season/etc. without parsing `path`.
 */
export interface TelemetryPageContext {
    mode: string;
    path: string;
    league?: string;
    season?: string;
    subsession?: string;
    simsession?: string;
    driver?: string;
    team?: string;
    car?: string;
    track?: string;
}

interface TelemetryEventBase {
    /** Discriminator — one of TELEMETRY_EVENT_NAMES. */
    event: TelemetryEventName;
    /** Client wall-clock, epoch ms. */
    ts: number;
    /** Monotonic per-session sequence number, starts at 1. */
    seq: number;
    /** Anonymous per-browser id (localStorage). */
    deviceId: string;
    /** Per-tab session id (sessionStorage). */
    sessionId: string;
    /** Page context at emit time. Absent only for very early events. */
    page?: TelemetryPageContext;
}

// ---------------------------------------------------------------------------
// Event variants
// ---------------------------------------------------------------------------

export interface SessionStartEvent extends TelemetryEventBase {
    event: 'session_start';
    props: {
        referrer: string;
        viewportW: number;
        viewportH: number;
        screenW: number;
        screenH: number;
        language: string;
        timezone: string;
    };
}

export interface PageViewEvent extends TelemetryEventBase {
    event: 'page_view';
    props: {
        /** True for the first view after full page load (vs SPA nav). */
        initial: boolean;
        referrer: string;
    };
}

export interface UiInteractionEvent extends TelemetryEventBase {
    event: 'ui_interaction';
    props: {
        /** Component or surface, e.g. 'photo-carousel', 'app-header'. */
        component: string;
        /** What happened, e.g. 'next_click', 'sign_in_click'. */
        action: string;
        /** Optional discriminating detail, e.g. a target id or label. */
        label?: string;
        /** Optional numeric detail, e.g. an index or count. */
        value?: number;
    };
}

export interface ErrorEvent extends TelemetryEventBase {
    event: 'error';
    props: {
        source: 'vue' | 'window' | 'unhandledrejection';
        message: string;
        /** Truncated stack — the client caps this before sending. */
        stack?: string;
    };
}

export interface TimingEvent extends TelemetryEventBase {
    event: 'timing';
    props: {
        /** Metric name, e.g. 'page_load', 'ttfb'. */
        metric: string;
        durationMs: number;
        label?: string;
    };
}

export interface IdentifyEvent extends TelemetryEventBase {
    event: 'identify';
    props: {
        /** Clerk user id. The server re-derives this from the auth
         *  token when present; the client-sent value is advisory. */
        userId: string;
    };
}

export type TelemetryEvent =
    | SessionStartEvent
    | PageViewEvent
    | UiInteractionEvent
    | ErrorEvent
    | TimingEvent
    | IdentifyEvent;

// ---------------------------------------------------------------------------
// Batch request / response — the wire shape of POST /api/telemetry/events
// ---------------------------------------------------------------------------

export interface TelemetryBatchRequest {
    /** Client wall-clock at send time — lets the backend correct for
     *  client clock skew (serverReceivedAt - sentAt ≈ skew + latency). */
    sentAt: number;
    events: TelemetryEvent[];
}

export interface TelemetryBatchResponse {
    accepted: number;
    rejected: number;
    /** Per-event rejection reasons, indexed into the request array. */
    errors?: { index: number; reason: string }[];
}

/** Server-side enrichment attached to each accepted event. This is
 *  the record shape handed to the sink — and, later, forwarded to the
 *  external telemetry service. */
export interface StoredTelemetryEvent {
    receivedAt: number;
    /** Verified Clerk user id when the batch carried a valid token. */
    userId?: string;
    userAgent?: string;
    event: TelemetryEvent;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Hard caps so a buggy or hostile client can't stuff the pipeline. */
export const TELEMETRY_LIMITS = {
    maxBatchEvents: 100,
    maxStringLength: 1000,
    maxStackLength: 4000,
} as const;

function isPlainObject(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isBoundedString(v: unknown, max: number): v is string {
    return typeof v === 'string' && v.length > 0 && v.length <= max;
}

function isFiniteNumber(v: unknown): v is number {
    return typeof v === 'number' && Number.isFinite(v);
}

function invalidPropsReason(
    event: TelemetryEventName,
    props: Record<string, unknown>
): string | null {
    const str = (v: unknown) =>
        typeof v === 'string' && v.length <= TELEMETRY_LIMITS.maxStringLength;
    const optStr = (v: unknown) => v === undefined || str(v);
    switch (event) {
        case 'session_start':
            if (typeof props.referrer !== 'string')
                return 'session_start.referrer must be a string';
            for (const k of ['viewportW', 'viewportH', 'screenW', 'screenH']) {
                if (!isFiniteNumber(props[k]))
                    return `session_start.${k} must be a number`;
            }
            if (!str(props.language) && props.language !== '')
                return 'session_start.language must be a string';
            if (!str(props.timezone) && props.timezone !== '')
                return 'session_start.timezone must be a string';
            return null;
        case 'page_view':
            if (typeof props.initial !== 'boolean')
                return 'page_view.initial must be a boolean';
            if (typeof props.referrer !== 'string')
                return 'page_view.referrer must be a string';
            return null;
        case 'ui_interaction':
            if (!isBoundedString(props.component, 200))
                return 'ui_interaction.component must be a non-empty string';
            if (!isBoundedString(props.action, 200))
                return 'ui_interaction.action must be a non-empty string';
            if (!optStr(props.label))
                return 'ui_interaction.label must be a string';
            if (props.value !== undefined && !isFiniteNumber(props.value))
                return 'ui_interaction.value must be a number';
            return null;
        case 'error':
            if (
                props.source !== 'vue' &&
                props.source !== 'window' &&
                props.source !== 'unhandledrejection'
            )
                return 'error.source must be vue|window|unhandledrejection';
            if (
                !isBoundedString(
                    props.message,
                    TELEMETRY_LIMITS.maxStringLength
                )
            )
                return 'error.message must be a non-empty string';
            if (
                props.stack !== undefined &&
                !isBoundedString(props.stack, TELEMETRY_LIMITS.maxStackLength)
            )
                return 'error.stack must be a bounded string';
            return null;
        case 'timing':
            if (!isBoundedString(props.metric, 200))
                return 'timing.metric must be a non-empty string';
            if (!isFiniteNumber(props.durationMs) || props.durationMs < 0)
                return 'timing.durationMs must be a non-negative number';
            if (!optStr(props.label)) return 'timing.label must be a string';
            return null;
        case 'identify':
            if (!isBoundedString(props.userId, 200))
                return 'identify.userId must be a non-empty string';
            return null;
    }
}

function invalidPageReason(page: unknown): string | null {
    if (page === undefined) return null;
    if (!isPlainObject(page)) return 'page must be an object';
    if (typeof page.mode !== 'string') return 'page.mode must be a string';
    if (!isBoundedString(page.path, TELEMETRY_LIMITS.maxStringLength))
        return 'page.path must be a non-empty string';
    for (const k of [
        'league',
        'season',
        'subsession',
        'simsession',
        'driver',
        'team',
        'car',
        'track',
    ]) {
        const v = page[k];
        if (v !== undefined && !isBoundedString(v, 200))
            return `page.${k} must be a string`;
    }
    return null;
}

/**
 * Validate a single event. Returns `null` when valid, otherwise a
 * human-readable reason. Deliberately hand-rolled — the shapes are
 * small and this avoids pulling a schema library into the client
 * bundle.
 */
export function invalidEventReason(raw: unknown): string | null {
    if (!isPlainObject(raw)) return 'event must be an object';
    const name = raw.event;
    if (
        typeof name !== 'string' ||
        !(TELEMETRY_EVENT_NAMES as readonly string[]).includes(name)
    )
        return `unknown event name: ${String(name)}`;
    if (!isFiniteNumber(raw.ts) || raw.ts <= 0)
        return 'ts must be a positive number';
    if (!isFiniteNumber(raw.seq) || raw.seq < 1)
        return 'seq must be a positive number';
    if (!isBoundedString(raw.deviceId, 100))
        return 'deviceId must be a non-empty string';
    if (!isBoundedString(raw.sessionId, 100))
        return 'sessionId must be a non-empty string';
    const pageReason = invalidPageReason(raw.page);
    if (pageReason) return pageReason;
    if (!isPlainObject(raw.props)) return 'props must be an object';
    return invalidPropsReason(name as TelemetryEventName, raw.props);
}

/**
 * Validate a batch request body. Returns the valid events plus
 * per-index rejection reasons for the rest — the endpoint accepts
 * partial batches rather than failing everything on one bad event.
 */
export function validateTelemetryBatch(raw: unknown): {
    valid: TelemetryEvent[];
    errors: { index: number; reason: string }[];
    batchError?: string;
} {
    if (!isPlainObject(raw))
        return { valid: [], errors: [], batchError: 'body must be an object' };
    if (!isFiniteNumber(raw.sentAt))
        return {
            valid: [],
            errors: [],
            batchError: 'sentAt must be a number',
        };
    if (!Array.isArray(raw.events))
        return {
            valid: [],
            errors: [],
            batchError: 'events must be an array',
        };
    if (raw.events.length > TELEMETRY_LIMITS.maxBatchEvents)
        return {
            valid: [],
            errors: [],
            batchError: `batch exceeds ${TELEMETRY_LIMITS.maxBatchEvents} events`,
        };

    const valid: TelemetryEvent[] = [];
    const errors: { index: number; reason: string }[] = [];
    raw.events.forEach((e, index) => {
        const reason = invalidEventReason(e);
        if (reason) {
            errors.push({ index, reason });
        } else {
            valid.push(e as TelemetryEvent);
        }
    });
    return { valid, errors };
}
