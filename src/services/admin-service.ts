/**
 * Admin service — schedule event CRUD operations.
 */

import { fetchUncached } from '@@/src/utils/api-client';

interface SchedEventResult {
    success: boolean;
    [key: string]: unknown;
}

export async function crtSchedEvent(
    season: string,
    time: string,
    track: string
): Promise<SchedEventResult> {
    const namespace = 'ldata-admcfg';
    const type = 'crtSchedEvent';
    return await fetchUncached<SchedEventResult>({
        namespace,
        type,
        season,
        time,
        track,
    });
}

export async function updSchedEvent(
    event: string,
    time: string,
    track: string
): Promise<SchedEventResult> {
    const namespace = 'ldata-admcfg';
    const type = 'updSchedEvent';
    return await fetchUncached<SchedEventResult>({
        namespace,
        type,
        event,
        time,
        track,
    });
}

export async function delSchedEvent(
    event: string
): Promise<SchedEventResult> {
    const namespace = 'ldata-admcfg';
    const type = 'delSchedEvent';
    return await fetchUncached<SchedEventResult>({
        namespace,
        type,
        event,
    });
}
