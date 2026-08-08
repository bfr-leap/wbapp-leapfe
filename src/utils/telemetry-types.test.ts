import { describe, it, expect } from 'vitest';
import {
    invalidEventReason,
    validateTelemetryBatch,
    TELEMETRY_LIMITS,
    type TelemetryEvent,
} from './telemetry-types';

function pageViewEvent(overrides: Record<string, unknown> = {}) {
    return {
        event: 'page_view',
        ts: 1700000000000,
        seq: 1,
        deviceId: 'dev-1',
        sessionId: 'sess-1',
        page: { mode: 'results', path: '/?m=results&league=4534' },
        props: { initial: true, referrer: '' },
        ...overrides,
    };
}

describe('invalidEventReason', () => {
    it('accepts a well-formed page_view', () => {
        expect(invalidEventReason(pageViewEvent())).toBeNull();
    });

    it('accepts every event variant', () => {
        const base = {
            ts: 1,
            seq: 1,
            deviceId: 'd',
            sessionId: 's',
        };
        const variants: TelemetryEvent[] = [
            {
                ...base,
                event: 'session_start',
                props: {
                    referrer: '',
                    viewportW: 1280,
                    viewportH: 800,
                    screenW: 1440,
                    screenH: 900,
                    language: 'en-US',
                    timezone: 'America/Chicago',
                },
            },
            {
                ...base,
                event: 'page_view',
                props: { initial: false, referrer: 'https://x.test' },
            },
            {
                ...base,
                event: 'ui_interaction',
                props: {
                    component: 'photo-carousel',
                    action: 'next_click',
                    value: 2,
                },
            },
            {
                ...base,
                event: 'error',
                props: { source: 'vue', message: 'boom', stack: 'at x' },
            },
            {
                ...base,
                event: 'timing',
                props: { metric: 'page_load', durationMs: 1234 },
            },
            {
                ...base,
                event: 'identify',
                props: { userId: 'user_abc' },
            },
        ];
        for (const v of variants) {
            expect(invalidEventReason(v)).toBeNull();
        }
    });

    it('rejects non-objects and unknown event names', () => {
        expect(invalidEventReason(null)).toMatch(/object/);
        expect(invalidEventReason('page_view')).toMatch(/object/);
        expect(invalidEventReason(pageViewEvent({ event: 'nope' }))).toMatch(
            /unknown event name/
        );
    });

    it('rejects a bad envelope', () => {
        expect(invalidEventReason(pageViewEvent({ ts: -5 }))).toMatch(/ts/);
        expect(invalidEventReason(pageViewEvent({ seq: 0 }))).toMatch(/seq/);
        expect(invalidEventReason(pageViewEvent({ deviceId: '' }))).toMatch(
            /deviceId/
        );
        expect(
            invalidEventReason(pageViewEvent({ sessionId: undefined }))
        ).toMatch(/sessionId/);
    });

    it('rejects bad page context but allows it to be absent', () => {
        expect(
            invalidEventReason(pageViewEvent({ page: { mode: 'x' } }))
        ).toMatch(/page\.path/);
        expect(
            invalidEventReason(pageViewEvent({ page: undefined }))
        ).toBeNull();
    });

    it('rejects variant-specific bad props', () => {
        expect(
            invalidEventReason(
                pageViewEvent({ props: { initial: 'yes', referrer: '' } })
            )
        ).toMatch(/initial/);
        expect(
            invalidEventReason(
                pageViewEvent({
                    event: 'ui_interaction',
                    props: { component: 'x', action: '' },
                })
            )
        ).toMatch(/action/);
        expect(
            invalidEventReason(
                pageViewEvent({
                    event: 'error',
                    props: { source: 'other', message: 'boom' },
                })
            )
        ).toMatch(/source/);
        expect(
            invalidEventReason(
                pageViewEvent({
                    event: 'timing',
                    props: { metric: 'page_load', durationMs: -1 },
                })
            )
        ).toMatch(/durationMs/);
    });
});

describe('validateTelemetryBatch', () => {
    it('accepts a batch and partitions valid/invalid events', () => {
        const res = validateTelemetryBatch({
            sentAt: 1700000000001,
            events: [
                pageViewEvent(),
                pageViewEvent({ seq: 0 }),
                pageViewEvent(),
            ],
        });
        expect(res.batchError).toBeUndefined();
        expect(res.valid).toHaveLength(2);
        expect(res.errors).toEqual([
            { index: 1, reason: expect.stringMatching(/seq/) },
        ]);
    });

    it('rejects malformed bodies wholesale', () => {
        expect(validateTelemetryBatch(null).batchError).toMatch(/object/);
        expect(validateTelemetryBatch({ events: [] }).batchError).toMatch(
            /sentAt/
        );
        expect(
            validateTelemetryBatch({ sentAt: 1, events: 'x' }).batchError
        ).toMatch(/array/);
    });

    it('rejects oversized batches', () => {
        const events = Array.from(
            { length: TELEMETRY_LIMITS.maxBatchEvents + 1 },
            () => pageViewEvent()
        );
        const res = validateTelemetryBatch({ sentAt: 1, events });
        expect(res.batchError).toMatch(/exceeds/);
        expect(res.valid).toHaveLength(0);
    });
});
