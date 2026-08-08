/**
 * Telemetry sink — log and forget.
 *
 * Storage is not this app's job: the long-term plan is a separate
 * telemetry service, reached the same way data lake access works
 * (a delegate call from the API layer into the external service).
 * Until that service exists, this logs one summary line per batch so
 * ingested traffic is visible in server logs, and drops the events.
 *
 * When the real implementation lands, this function body becomes the
 * delegate call — the endpoint and the wire contract don't change.
 */

import type { StoredTelemetryEvent } from '@@/src/utils/telemetry-types';

export function sinkTelemetryEvents(records: StoredTelemetryEvent[]): void {
    const names = records.map((r) => r.event.event);
    console.log(
        `[telemetry] ingested ${records.length} event(s): ${names.join(',')}`
    );
}
