/**
 * Proxies the broker's `/trkcam/*` endpoints, which are the only ones
 * that return `image/png` bytes instead of JSON. Kept separate from
 * `fetch-document.ts` because that handler's fixture/record machinery
 * assumes a JSON body throughout.
 */

import type { H3Event } from 'h3';

const BASE_URL =
    process.env.LEAP_DATA_BROKER_BASE_URL || 'http://98.116.118.25:3030/api';

// Bounds how long a stalled or unreachable broker can hold a request
// open — otherwise an outage hangs page loads (and the Playwright
// audit tool) instead of failing over to the "no capture" fallback.
const FETCH_TIMEOUT_MS = 8000;

export async function proxyTrkcamImage(
    event: H3Event,
    path: string
): Promise<Buffer | { error: string }> {
    let res: Response;
    try {
        res = await fetch(`${BASE_URL}${path}`, {
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
    } catch (e) {
        setResponseStatus(event, 502);
        return { error: 'Winner capture service unavailable' };
    }

    setResponseStatus(event, res.status);

    if (!res.ok) {
        return await res
            .json()
            .catch(() => ({ error: 'Winner capture not found' }));
    }

    const contentType = res.headers.get('content-type');
    const etag = res.headers.get('etag');
    const cacheControl = res.headers.get('cache-control');
    if (contentType) setResponseHeader(event, 'content-type', contentType);
    if (etag) setResponseHeader(event, 'etag', etag);
    if (cacheControl) setResponseHeader(event, 'cache-control', cacheControl);

    return Buffer.from(await res.arrayBuffer());
}
