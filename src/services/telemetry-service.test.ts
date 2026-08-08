import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    initTelemetry,
    setTelemetryPage,
    trackPageView,
    trackUiEvent,
    trackError,
    trackTiming,
    identifyUser,
    flushTelemetry,
    _resetTelemetryForTests,
    _telemetryQueueForTests,
} from './telemetry-service';
import { invalidEventReason } from '@@/src/utils/telemetry-types';

let fetchCalls: { url: string; init: RequestInit }[] = [];

beforeEach(() => {
    fetchCalls = [];
    vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string, init: RequestInit) => {
            fetchCalls.push({ url, init });
            return { ok: true, status: 200 };
        })
    );
    localStorage.clear();
    sessionStorage.clear();
});

afterEach(() => {
    _resetTelemetryForTests();
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

describe('telemetry-service', () => {
    it('is a no-op before init', () => {
        trackUiEvent('x', 'y');
        expect(_telemetryQueueForTests()).toHaveLength(0);
    });

    it('queues events with a monotonic seq and stable ids', () => {
        initTelemetry();
        trackUiEvent('photo-carousel', 'next_click', undefined, 3);
        trackTiming('page_load', 1234.6);
        const q = _telemetryQueueForTests();
        expect(q).toHaveLength(2);
        expect(q[0].seq).toBe(1);
        expect(q[1].seq).toBe(2);
        expect(q[0].deviceId).toBe(q[1].deviceId);
        expect(q[0].sessionId).toBe(q[1].sessionId);
        expect(q[1].props).toEqual({ metric: 'page_load', durationMs: 1235 });
    });

    it('persists deviceId across re-inits via localStorage', () => {
        initTelemetry();
        trackUiEvent('a', 'b');
        const first = _telemetryQueueForTests()[0].deviceId;
        _resetTelemetryForTests();
        initTelemetry();
        trackUiEvent('a', 'b');
        expect(_telemetryQueueForTests()[0].deviceId).toBe(first);
    });

    it('attaches the current page context to subsequent events', () => {
        initTelemetry();
        trackUiEvent('a', 'b');
        setTelemetryPage({ mode: 'results', path: '/?m=results' });
        trackPageView({ initial: true });
        const q = _telemetryQueueForTests();
        expect(q[0].page).toBeUndefined();
        expect(q[1].page).toEqual({ mode: 'results', path: '/?m=results' });
    });

    it('emits events that pass the shared wire validator', () => {
        initTelemetry();
        setTelemetryPage({
            mode: 'standings',
            path: '/?m=standings&league=4534',
            league: '4534',
        });
        trackPageView({ initial: false });
        trackUiEvent('app-header', 'sign_in_click', 'desktop');
        trackError('vue', 'boom', 'stack\n  at x');
        trackTiming('page_load', 42, 'cold');
        identifyUser('user_123');
        for (const e of _telemetryQueueForTests()) {
            expect(invalidEventReason(e)).toBeNull();
        }
    });

    it('flushes the queue as a single batch POST', async () => {
        initTelemetry();
        trackUiEvent('a', 'b');
        trackUiEvent('c', 'd');
        await flushTelemetry();
        expect(fetchCalls).toHaveLength(1);
        expect(fetchCalls[0].url).toBe('/api/telemetry/events');
        const body = JSON.parse(fetchCalls[0].init.body as string);
        expect(typeof body.sentAt).toBe('number');
        expect(body.events).toHaveLength(2);
        expect(_telemetryQueueForTests()).toHaveLength(0);
    });

    it('does not POST when the queue is empty', async () => {
        initTelemetry();
        await flushTelemetry();
        expect(fetchCalls).toHaveLength(0);
    });

    it('auto-flushes when the queue reaches the batch cap', () => {
        initTelemetry();
        for (let i = 0; i < 20; i++) trackUiEvent('spam', `evt-${i}`);
        expect(fetchCalls).toHaveLength(1);
    });

    it('attaches an auth token when a supplier is provided', async () => {
        initTelemetry({ getToken: async () => 'tok-123' });
        trackUiEvent('a', 'b');
        await flushTelemetry();
        const headers = fetchCalls[0].init.headers as Record<string, string>;
        expect(headers.Authorization).toBe('Bearer tok-123');
    });

    it('survives a token supplier that rejects', async () => {
        initTelemetry({
            getToken: async () => {
                throw new Error('clerk not ready');
            },
        });
        trackUiEvent('a', 'b');
        await flushTelemetry();
        expect(fetchCalls).toHaveLength(1);
        const headers = fetchCalls[0].init.headers as Record<string, string>;
        expect(headers.Authorization).toBeUndefined();
    });

    it('re-queues events when the POST fails', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => {
                throw new Error('network down');
            })
        );
        initTelemetry();
        trackUiEvent('a', 'b');
        await flushTelemetry();
        expect(_telemetryQueueForTests()).toHaveLength(1);
    });

    it('drops invalid inputs instead of queueing junk', () => {
        initTelemetry();
        trackError('vue', '');
        trackTiming('page_load', NaN);
        trackTiming('page_load', -5);
        identifyUser('');
        expect(_telemetryQueueForTests()).toHaveLength(0);
    });
});
