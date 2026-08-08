import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    getTelemetryStore,
    setTelemetryStoreForTests,
} from './telemetry-store';
import type { StoredTelemetryEvent } from '@@/src/utils/telemetry-types';

function record(n: number): StoredTelemetryEvent {
    return {
        receivedAt: 1700000000000 + n,
        event: {
            event: 'ui_interaction',
            ts: 1700000000000 + n,
            seq: n,
            deviceId: 'd',
            sessionId: 's',
            props: { component: 'test', action: `evt-${n}` },
        },
    };
}

beforeEach(() => {
    setTelemetryStoreForTests(null);
    vi.spyOn(console, 'log').mockImplementation(() => {});
});

describe('InMemoryTelemetryStore', () => {
    it('returns ingested events most-recent-first', async () => {
        const store = getTelemetryStore();
        await store.ingest([record(1), record(2), record(3)]);
        const recent = await store.recent(2);
        expect(recent.map((r) => r.event.seq)).toEqual([3, 2]);
    });

    it('bounds the ring buffer', async () => {
        const store = getTelemetryStore();
        for (let i = 0; i < 6; i++) {
            await store.ingest(
                Array.from({ length: 100 }, (_, j) => record(i * 100 + j))
            );
        }
        const recent = await store.recent(1000);
        expect(recent.length).toBeLessThanOrEqual(500);
        expect(recent[0].event.seq).toBe(599);
    });

    it('is a singleton across getTelemetryStore calls', async () => {
        await getTelemetryStore().ingest([record(1)]);
        const recent = await getTelemetryStore().recent(10);
        expect(recent).toHaveLength(1);
    });
});
