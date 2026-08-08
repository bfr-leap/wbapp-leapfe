/**
 * Telemetry store abstraction — the seam where the real DB backend
 * plugs in.
 *
 * The ingest endpoint (`server/api/telemetry/events.post.ts`) is
 * intentionally ignorant of storage: it validates, enriches, and
 * calls `ingest()`. Swapping the in-memory stub for a DB-backed
 * implementation means writing a new `TelemetryStore` and changing
 * `getTelemetryStore()` — nothing else moves.
 *
 * The stub keeps a bounded ring buffer (so the debug endpoint can
 * show recent events during development) and logs one structured
 * line per batch so ingested traffic is visible in server logs even
 * before a DB exists.
 */

import type { StoredTelemetryEvent } from '@@/src/utils/telemetry-types';

export interface TelemetryStore {
    ingest(records: StoredTelemetryEvent[]): Promise<void>;
    /** Most-recent-first sample of stored events, for debugging. */
    recent(limit: number): Promise<StoredTelemetryEvent[]>;
}

const RING_SIZE = 500;

class InMemoryTelemetryStore implements TelemetryStore {
    private ring: StoredTelemetryEvent[] = [];

    async ingest(records: StoredTelemetryEvent[]): Promise<void> {
        this.ring.push(...records);
        if (this.ring.length > RING_SIZE) {
            this.ring = this.ring.slice(this.ring.length - RING_SIZE);
        }
        // One line per batch, not per event — enough to confirm the
        // pipeline is live without flooding logs.
        const names = records.map((r) => r.event.event);
        console.log(
            `[telemetry] ingested ${records.length} event(s): ${names.join(
                ','
            )}`
        );
    }

    async recent(limit: number): Promise<StoredTelemetryEvent[]> {
        return this.ring.slice(-limit).reverse();
    }
}

let _store: TelemetryStore | null = null;

export function getTelemetryStore(): TelemetryStore {
    if (!_store) {
        _store = new InMemoryTelemetryStore();
    }
    return _store;
}

/** Exposed for unit tests — swaps in a fake store. */
export function setTelemetryStoreForTests(store: TelemetryStore | null): void {
    _store = store;
}
