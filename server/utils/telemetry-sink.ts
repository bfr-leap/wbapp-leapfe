/**
 * Telemetry sink — forwards ingested events to the usage-tracking service.
 *
 * Storage is not this app's job. Accepted batches are delegated to
 * `POST {base}/usage/events` on wbsvc-dtbrkrrd, which owns the schema, the
 * dedup index and the query endpoints. This module is the whole of the
 * coupling: nothing else here knows where usage data lands, so moving that
 * service somewhere else later is a URL change.
 *
 * Configuration (all optional — the defaults match the data lake path, so a
 * working broker config is already a working usage config):
 *
 *   USAGE_SERVICE_URL       base URL for the usage API, including /api.
 *                           Falls back to LEAP_DATA_BROKER_BASE_URL, then to
 *                           the same default lplib's data lake client uses.
 *   USAGE_API_TOKEN         shared secret, sent as a bearer token. Omit and
 *                           the service must also be running without one.
 *   USAGE_SINK_TIMEOUT_MS   per-request timeout, default 5000.
 *   USAGE_SINK_DISABLED=1   drop events after logging, forward nothing.
 *                           Useful in dev and in the SSR smoke suite.
 */

import type { StoredTelemetryEvent } from '@@/src/utils/telemetry-types';

const DEFAULT_TIMEOUT_MS = 5000;

export type SinkResult =
    | { ok: true; accepted: number; stored: number }
    /** `retryable` drives the ingest endpoint's status code, which in turn
     *  drives the browser client's re-queue: it retries 5xx and network
     *  failures, and drops anything else. A rejected batch or a bad token
     *  will fail identically forever, so those are reported as permanent —
     *  retrying them would just spin. */
    | { ok: false; retryable: boolean; reason: string };

function baseUrl(): string {
    const url =
        process.env.USAGE_SERVICE_URL ||
        process.env.LEAP_DATA_BROKER_BASE_URL ||
        'http://98.116.118.25:3030/api';
    return url.replace(/\/+$/, '');
}

function timeoutMs(): number {
    const raw = Number(process.env.USAGE_SINK_TIMEOUT_MS);
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TIMEOUT_MS;
}

/**
 * Forward a batch. Never throws — every failure comes back as a
 * `{ ok: false }` result so the caller decides the HTTP status.
 *
 * `sentAt` is the browser's clock when the batch left the page; passing it
 * through lets the storage service measure clock skew against its own
 * receive time. It is genuinely optional.
 */
export async function sinkTelemetryEvents(
    records: StoredTelemetryEvent[],
    opts: { sentAt?: number } = {}
): Promise<SinkResult> {
    if (records.length === 0) {
        return { ok: true, accepted: 0, stored: 0 };
    }

    if (process.env.USAGE_SINK_DISABLED === '1') {
        const names = records.map((r) => r.event.event);
        console.log(
            `[telemetry] sink disabled — dropped ${
                records.length
            } event(s): ${names.join(',')}`
        );
        return { ok: true, accepted: records.length, stored: 0 };
    }

    const token = process.env.USAGE_API_TOKEN;
    const url = `${baseUrl()}/usage/events`;

    let res: Response;
    try {
        res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
                ...(opts.sentAt !== undefined ? { sentAt: opts.sentAt } : {}),
                records,
            }),
            signal: AbortSignal.timeout(timeoutMs()),
        });
    } catch (e) {
        // Network failure, DNS, or timeout — all transient by assumption.
        const reason = e instanceof Error ? e.message : String(e);
        console.error(`[telemetry] sink request failed: ${reason}`);
        return { ok: false, retryable: true, reason };
    }

    if (!res.ok) {
        const reason = `usage service responded ${res.status}`;
        // 5xx is the service having a bad time; retrying is worth it. 4xx
        // means we sent something it will never accept (bad token, bad
        // shape) — log loudly, drop, and don't spin the client.
        const retryable = res.status >= 500;
        if (retryable) console.error(`[telemetry] ${reason}`);
        else
            console.error(
                `[telemetry] ${reason} — dropping batch, check USAGE_* config`
            );
        return { ok: false, retryable, reason };
    }

    const body = (await res.json().catch(() => null)) as {
        accepted?: number;
        stored?: number;
    } | null;

    return {
        ok: true,
        accepted: body?.accepted ?? records.length,
        stored: body?.stored ?? 0,
    };
}
