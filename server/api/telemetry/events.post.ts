import { middleware as authMiddleware } from '../middleware/_auth-user';
import {
    validateTelemetryBatch,
    type StoredTelemetryEvent,
    type TelemetryBatchResponse,
} from '@@/src/utils/telemetry-types';
import { sinkTelemetryEvents } from '@@/server/utils/telemetry-sink';

/**
 * POST /api/telemetry/events — batch ingest for the in-house
 * telemetry pipeline (see src/utils/telemetry-types.ts for the wire
 * contract and src/services/telemetry-service.ts for the client).
 *
 * Behavior:
 *  - Accepts partial batches: invalid events are rejected per-index,
 *    valid ones are stored. The client treats any 2xx as delivered.
 *  - Auth is optional. Page-hide beacons arrive unauthenticated; when
 *    a Clerk token is present and verifies, the verified user id is
 *    attached server-side (client-sent `identify` props are advisory).
 *  - Accepted events are forwarded by the sink
 *    (server/utils/telemetry-sink.ts) to the usage service on
 *    wbsvc-dtbrkrrd. This app never stores telemetry itself.
 *  - Enrichment captures the client's public IP alongside the user
 *    agent. Geo resolution is deliberately NOT done here — that's the
 *    storage/analytics service's job. It has to be captured at ingest
 *    though: the delegate call originates from this app's server, so
 *    the usage service never sees the client's address itself.
 *  - A transient delegate failure answers 502 so the browser client
 *    re-queues the batch and retries on its next tick (it retries 5xx
 *    and network errors only, and its queue is bounded). The usage
 *    service dedupes on retransmit, so this cannot double-count. A 4xx
 *    from the delegate is permanent — a bad token or a contract
 *    mismatch — so the batch is logged, dropped, and reported as
 *    accepted rather than spinning the client forever.
 */
export default defineEventHandler(
    async (event): Promise<TelemetryBatchResponse> => {
        const body = await readBody(event).catch(() => null);

        const { valid, errors, batchError } = validateTelemetryBatch(body);
        if (batchError) {
            throw createError({ statusCode: 400, statusMessage: batchError });
        }

        // Optional auth — mirror fetch-document's lenient posture: a
        // missing or invalid token downgrades to anonymous instead of
        // failing the batch.
        const req: any = event.node.req;
        const authorizationHeader: string = req?.headers?.authorization || '';
        const rawToken = authorizationHeader.replace(/^Bearer\s+/, '');
        const hasToken = !!rawToken && rawToken !== 'null';

        let userId: string | undefined;
        if (hasToken) {
            await authMiddleware(req, async (rq: any) => {
                userId = rq?.user?.id || undefined;
            });
        }

        if (valid.length > 0) {
            const receivedAt = Date.now();
            const userAgent: string | undefined =
                req?.headers?.['user-agent'] || undefined;
            // First hop of x-forwarded-for (set by the Vercel edge in
            // production), falling back to the socket address for
            // local dev. Spoofable in theory, fine for analytics.
            const clientIp: string | undefined =
                getRequestIP(event, { xForwardedFor: true }) || undefined;
            const records: StoredTelemetryEvent[] = valid.map((e) => ({
                receivedAt,
                ...(userId ? { userId } : {}),
                ...(userAgent ? { userAgent } : {}),
                ...(clientIp ? { clientIp } : {}),
                event: e,
            }));
            // `sentAt` is validated above, so it is a finite number here.
            const sentAt = (body as { sentAt: number }).sentAt;
            const result = await sinkTelemetryEvents(records, { sentAt });
            if (!result.ok && result.retryable) {
                throw createError({
                    statusCode: 502,
                    statusMessage: `Telemetry sink unavailable: ${result.reason}`,
                });
            }
        }

        return {
            accepted: valid.length,
            rejected: errors.length,
            ...(errors.length > 0 ? { errors } : {}),
        };
    }
);
