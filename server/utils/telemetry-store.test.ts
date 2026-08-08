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
});

describe('LoggingTelemetryStore', () => {
    it('logs one summary line per ingested batch', async () => {
        const log = vi.spyOn(console, 'log').mockImplementation(() => {});
        await getTelemetryStore().ingest([record(1), record(2)]);
        expect(log).toHaveBeenCalledTimes(1);
        expect(log.mock.calls[0][0]).toMatch(/ingested 2 event\(s\)/);
        log.mockRestore();
    });

    it('is a singleton across getTelemetryStore calls', () => {
        expect(getTelemetryStore()).toBe(getTelemetryStore());
    });

    it('supports swapping in a fake store for tests', async () => {
        const ingested: StoredTelemetryEvent[][] = [];
        setTelemetryStoreForTests({
            ingest: async (records) => {
                ingested.push(records);
            },
        });
        await getTelemetryStore().ingest([record(1)]);
        expect(ingested).toHaveLength(1);
        expect(ingested[0][0].event.seq).toBe(1);
    });
});
