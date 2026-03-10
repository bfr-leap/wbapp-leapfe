/**
 * Admin service — schedule event CRUD operations.
 */

import { fetchUncached } from '@@/src/utils/api-client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function crtSchedEvent(
    season: string,
    time: string,
    track: string
): Promise<any> {
    const namespace = 'ldata-admcfg';
    const type = 'crtSchedEvent';
    return await fetchUncached({ namespace, type, season, time, track });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updSchedEvent(
    event: string,
    time: string,
    track: string
): Promise<any> {
    const namespace = 'ldata-admcfg';
    const type = 'updSchedEvent';
    return await fetchUncached({ namespace, type, event, time, track });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function delSchedEvent(event: string): Promise<any> {
    const namespace = 'ldata-admcfg';
    const type = 'delSchedEvent';
    return await fetchUncached({ namespace, type, event });
}
