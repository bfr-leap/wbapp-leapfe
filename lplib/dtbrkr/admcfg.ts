const BASE_URL = 'http://98.116.118.25:3030/api';

async function crtSchedEvent(
    season: string,
    time: string,
    track: string,
    authHeader: string
) {
    console.log('::: crtSchedEvent(): proxy', season, time, track);

    const url = `${BASE_URL}/admin/schedule/events`;
    try {
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
            console.log('crtSchedEvent proxy error:', res.status, err);
            return {};
        }

        return await res.json();
    } catch (e) {
        console.log('error reaching proxy', e);
        return {};
    }
}

async function updSchedEvent(
    event: string,
    time: string,
    track: string,
    authHeader: string
) {
    console.log('::: updSchedEvent(): proxy', event, time, track);

    const url = `${BASE_URL}/admin/schedule/events/${event}`;
    try {
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
            console.log('updSchedEvent proxy error:', res.status, err);
            return {};
        }

        return await res.json();
    } catch (e) {
        console.log('error reaching proxy', e);
        return {};
    }
}

async function delSchedEvent(event: string, authHeader: string) {
    console.log('::: delSchedEvent(): proxy', event);

    const url = `${BASE_URL}/admin/schedule/events/${event}`;
    try {
        const res = await fetch(url, {
            method: 'DELETE',
            headers: {
                Authorization: authHeader,
            },
        });

        if (!res.ok) {
            const err = await res.text();
            console.log('delSchedEvent proxy error:', res.status, err);
            return {};
        }

        return await res.json();
    } catch (e) {
        console.log('error reaching proxy', e);
        return {};
    }
}

export async function adminConfigHandler(
    namespace: string,
    query: any
): Promise<any> {
    console.log(':: adminConfigHandler() proxy');

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
