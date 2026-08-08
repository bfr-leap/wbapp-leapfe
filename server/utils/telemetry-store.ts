/**
 * Telemetry store abstraction — the seam where the real DB backend
 * plugs in.
 *
 * The ingest endpoint (`server/api/telemetry/events.post.ts`) is
 * intentionally ignorant of storage: it validates, enriches, and
 * calls `ingest()`. Swapping the log stub for a DB-backed
 * implementation means writing a new `TelemetryStore` and changing
 * `getTelemetryStore()` — nothing else moves.
 *
 * This app owns the write path only. Reading telemetry back out
 * (dashboards, reports) is a separate consumer that will query the
 * DB directly — deliberately no read methods here.
 */

import type { StoredTelemetryEvent } from '@@/src/utils/telemetry-types';

export interface TelemetryStore {
    ingest(records: StoredTelemetryEvent[]): Promise<void>;
}

class LoggingTelemetryStore implements TelemetryStore {
    async ingest(records: StoredTelemetryEvent[]): Promise<void> {
        // One line per batch, not per event — enough to confirm the
        // pipeline is live in server logs until the DB backend lands.
        const names = records.map((r) => r.event.event);
        console.log(
            `[telemetry] ingested ${records.length} event(s): ${names.join(
                ','
            )}`
        );
    }
}

let _store: TelemetryStore | null = null;

export function getTelemetryStore(): TelemetryStore {
    if (!_store) {
        _store = new LoggingTelemetryStore();
    }
    return _store;
}

/** Exposed for unit tests — swaps in a fake store. */
export function setTelemetryStoreForTests(store: TelemetryStore | null): void {
    _store = store;
}
