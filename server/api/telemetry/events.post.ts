import { middleware as authMiddleware } from '../middleware/_auth-user';
import {
    validateTelemetryBatch,
    type StoredTelemetryEvent,
    type TelemetryBatchResponse,
} from '@@/src/utils/telemetry-types';
import { getTelemetryStore } from '@@/server/utils/telemetry-store';

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
 *  - Storage goes through the TelemetryStore seam
 *    (server/utils/telemetry-store.ts) where the DB backend plugs in.
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
            const records: StoredTelemetryEvent[] = valid.map((e) => ({
                receivedAt,
                ...(userId ? { userId } : {}),
                ...(userAgent ? { userAgent } : {}),
                event: e,
            }));
            try {
                await getTelemetryStore().ingest(records);
            } catch (e) {
                // Storage failures shouldn't bounce the client into
                // retry loops — log and report the batch as accepted.
                console.error('[telemetry] store ingest failed', e);
            }
        }

        return {
            accepted: valid.length,
            rejected: errors.length,
            ...(errors.length > 0 ? { errors } : {}),
        };
    }
);
