import { getTelemetryStore } from '@@/server/utils/telemetry-store';

/**
 * GET /api/telemetry/recent — development-only peek at the last few
 * ingested events, for verifying the client wiring end-to-end.
 *
 * Disabled in production (404) unless `LEAP_TELEMETRY_DEBUG=1` is
 * set: the in-memory stub only holds a small ring buffer, but once a
 * DB backend lands this surface would expose real usage data.
 */
export default defineEventHandler(async (event) => {
    const enabled =
        process.env.NODE_ENV !== 'production' ||
        process.env.LEAP_TELEMETRY_DEBUG === '1';
    if (!enabled) {
        throw createError({ statusCode: 404, statusMessage: 'Not Found' });
    }

    const query = getQuery(event);
    const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 200);
    const events = await getTelemetryStore().recent(limit);
    return { count: events.length, events };
});
