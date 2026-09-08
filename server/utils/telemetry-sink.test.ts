import { sinkTelemetryEvents } from './telemetry-sink';
import type { StoredTelemetryEvent } from '@@/src/utils/telemetry-types';

const T0 = 1_760_000_000_000;

const ENV_KEYS = [
    'USAGE_SERVICE_URL',
    'LEAP_DATA_BROKER_BASE_URL',
    'USAGE_API_TOKEN',
    'USAGE_SINK_TIMEOUT_MS',
    'USAGE_SINK_DISABLED',
] as const;

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
    for (const key of ENV_KEYS) delete process.env[key];
    process.env.USAGE_SERVICE_URL = 'http://usage.test/api';
    fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ accepted: 1, rejected: 0, stored: 1 }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
        })
    );
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
    for (const key of ENV_KEYS) delete process.env[key];
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

const record: StoredTelemetryEvent = {
    receivedAt: T0,
    userId: 'user_1',
    userAgent: 'Mozilla/5.0',
    clientIp: '203.0.113.7',
    event: {
        event: 'page_view',
        ts: T0 - 10,
        seq: 1,
        deviceId: 'dev_a',
        sessionId: 'sess_a',
        page: { mode: 'standings', path: '/?m=standings' },
        props: { initial: true, referrer: '' },
    },
};

function lastCall() {
    const [url, init] = fetchMock.mock.calls[0]!;
    return { url, init, body: JSON.parse(init.body) };
}

describe('sinkTelemetryEvents', () => {
    it('POSTs the batch to the usage service', async () => {
        const result = await sinkTelemetryEvents([record], { sentAt: T0 - 5 });

        expect(result).toEqual({ ok: true, accepted: 1, stored: 1 });
        const { url, init, body } = lastCall();
        expect(url).toBe('http://usage.test/api/usage/events');
        expect(init.method).toBe('POST');
        expect(body).toEqual({ sentAt: T0 - 5, records: [record] });
    });

    it('omits sentAt when the caller does not supply it', async () => {
        await sinkTelemetryEvents([record]);
        expect(lastCall().body).toEqual({ records: [record] });
    });

    it('short-circuits an empty batch without a request', async () => {
        expect(await sinkTelemetryEvents([])).toEqual({
            ok: true,
            accepted: 0,
            stored: 0,
        });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('strips trailing slashes from the configured base URL', async () => {
        process.env.USAGE_SERVICE_URL = 'http://usage.test/api///';
        await sinkTelemetryEvents([record]);
        expect(lastCall().url).toBe('http://usage.test/api/usage/events');
    });

    it('falls back to the data broker base URL', async () => {
        delete process.env.USAGE_SERVICE_URL;
        process.env.LEAP_DATA_BROKER_BASE_URL = 'http://broker.test/api';
        await sinkTelemetryEvents([record]);
        expect(lastCall().url).toBe('http://broker.test/api/usage/events');
    });

    it('sends a bearer token when configured, and none otherwise', async () => {
        await sinkTelemetryEvents([record]);
        expect(lastCall().init.headers.Authorization).toBeUndefined();

        fetchMock.mockClear();
        process.env.USAGE_API_TOKEN = 's3cret';
        await sinkTelemetryEvents([record]);
        expect(lastCall().init.headers.Authorization).toBe('Bearer s3cret');
    });

    it('drops everything when the sink is disabled', async () => {
        process.env.USAGE_SINK_DISABLED = '1';
        expect(await sinkTelemetryEvents([record])).toEqual({
            ok: true,
            accepted: 1,
            stored: 0,
        });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    // The browser client re-queues on 5xx and network errors only, so the
    // retryable flag decides whether a batch survives an outage.
    it('reports a 5xx as retryable', async () => {
        fetchMock.mockResolvedValue(new Response('nope', { status: 503 }));
        expect(await sinkTelemetryEvents([record])).toEqual({
            ok: false,
            retryable: true,
            reason: 'usage service responded 503',
        });
    });

    it('reports a 4xx as permanent', async () => {
        fetchMock.mockResolvedValue(new Response('nope', { status: 401 }));
        expect(await sinkTelemetryEvents([record])).toEqual({
            ok: false,
            retryable: false,
            reason: 'usage service responded 401',
        });
    });

    it('reports a network failure as retryable instead of throwing', async () => {
        fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
        expect(await sinkTelemetryEvents([record])).toEqual({
            ok: false,
            retryable: true,
            reason: 'ECONNREFUSED',
        });
    });

    it('survives a success response with an unparseable body', async () => {
        fetchMock.mockResolvedValue(new Response('not json', { status: 200 }));
        expect(await sinkTelemetryEvents([record])).toEqual({
            ok: true,
            accepted: 1,
            stored: 0,
        });
    });

    it('passes an abort signal so a hung service cannot wedge ingest', async () => {
        await sinkTelemetryEvents([record]);
        expect(lastCall().init.signal).toBeInstanceOf(AbortSignal);
    });
});
