const BASE_URL = 'http://98.116.118.25:3030/api';

async function crtSchedEvent(
    season: string,
    time: string,
    track: string,
    authHeader: string
) {
    const url = `${BASE_URL}/admin/schedule/events`;
    console.log('[ADMCFG] crtSchedEvent → POST', url, {
        season,
        time,
        track,
        hasAuth: !!authHeader,
    });

    try {
        const t0 = Date.now();
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: authHeader,
            },
            body: JSON.stringify({
                season: Number.parseInt(season, 10),
                time: Number.parseInt(time, 10),
                track: Number.parseInt(track, 10),
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            console.error(
                `[ADMCFG] crtSchedEvent FAILED: ${res.status} ${Date.now() - t0}ms`,
                err
            );
            return {};
        }

        const json = await res.json();
        console.log(
            `[ADMCFG] crtSchedEvent OK: ${res.status} ${Date.now() - t0}ms`
        );
        return json;
    } catch (e) {
        console.error(
            `[ADMCFG] crtSchedEvent NETWORK ERROR (BASE_URL=${BASE_URL}):`,
            e instanceof Error ? e.message : e
        );
        return {};
    }
}

async function updSchedEvent(
    event: string,
    time: string,
    track: string,
    authHeader: string
) {
    const url = `${BASE_URL}/admin/schedule/events/${event}`;
    console.log('[ADMCFG] updSchedEvent → PUT', url, {
        event,
        time,
        track,
        hasAuth: !!authHeader,
    });

    try {
        const t0 = Date.now();
        const res = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: authHeader,
            },
            body: JSON.stringify({
                time: Number.parseInt(time, 10),
                track: Number.parseInt(track, 10),
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            console.error(
                `[ADMCFG] updSchedEvent FAILED: ${res.status} ${Date.now() - t0}ms`,
                err
            );
            return {};
        }

        const json = await res.json();
        console.log(
            `[ADMCFG] updSchedEvent OK: ${res.status} ${Date.now() - t0}ms`
        );
        return json;
    } catch (e) {
        console.error(
            `[ADMCFG] updSchedEvent NETWORK ERROR (BASE_URL=${BASE_URL}):`,
            e instanceof Error ? e.message : e
        );
        return {};
    }
}

async function delSchedEvent(event: string, authHeader: string) {
    const url = `${BASE_URL}/admin/schedule/events/${event}`;
    console.log('[ADMCFG] delSchedEvent → DELETE', url, {
        event,
        hasAuth: !!authHeader,
    });

    try {
        const t0 = Date.now();
        const res = await fetch(url, {
            method: 'DELETE',
            headers: {
                Authorization: authHeader,
            },
        });

        if (!res.ok) {
            const err = await res.text();
            console.error(
                `[ADMCFG] delSchedEvent FAILED: ${res.status} ${Date.now() - t0}ms`,
                err
            );
            return {};
        }

        const json = await res.json();
        console.log(
            `[ADMCFG] delSchedEvent OK: ${res.status} ${Date.now() - t0}ms`
        );
        return json;
    } catch (e) {
        console.error(
            `[ADMCFG] delSchedEvent NETWORK ERROR (BASE_URL=${BASE_URL}):`,
            e instanceof Error ? e.message : e
        );
        return {};
    }
}

export async function adminConfigHandler(
    namespace: string,
    query: any
): Promise<any> {
    console.log('[ADMCFG] adminConfigHandler()', {
        type: query?.type,
        BASE_URL,
    });

    const q = query;
    const authHeader = q?._authHeader || '';

    let doc: any = null;

    switch (q?.type) {
        case 'crtSchedEvent':
            doc = await crtSchedEvent(
                q?.season,
                q?.time,
                q?.track,
                authHeader
            );
            break;
        case 'updSchedEvent':
            doc = await updSchedEvent(
                q?.event,
                q?.time,
                q?.track,
                authHeader
            );
            break;
        case 'delSchedEvent':
            doc = await delSchedEvent(q?.event, authHeader);
            break;
    }

    return doc;
}
