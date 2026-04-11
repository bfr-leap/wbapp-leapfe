/**
 * Steward configuration & rulings handler.
 *
 * Backed by wbsvc-dtbrkrrd REST endpoints:
 *   GET  /api/rulings/:leagueId/:seasonId
 *   GET  /api/rulings/:leagueId/:seasonId/driver/:discordUserId
 *   GET  /api/steward-config/:leagueId
 *   PUT  /api/steward-config/:leagueId
 *
 * The frontend never accesses the data store directly — every read and
 * write goes through these endpoints.
 */

const BASE_URL =
    process.env.LEAP_DATA_BROKER_BASE_URL || 'http://98.116.118.25:3030/api';

interface ErrorResult {
    _error: true;
    _source: string;
    _message: string;
    _url: string;
    _baseUrl?: string;
}

function makeError(source: string, message: string, url: string): ErrorResult {
    return {
        _error: true,
        _source: source,
        _message: message,
        _url: url,
        _baseUrl: BASE_URL,
    };
}

async function getRulings(league: string, season: string, authHeader: string) {
    const url = `${BASE_URL}/rulings/${league}/${season}`;
    console.log('[STWDCFG] getRulings → GET', url);
    try {
        const t0 = Date.now();
        const res = await fetch(url, {
            method: 'GET',
            headers: { Authorization: authHeader },
        });

        if (!res.ok) {
            const err = await res.text();
            console.error(
                `[STWDCFG] getRulings FAILED: ${res.status} ${
                    Date.now() - t0
                }ms`,
                err
            );
            return makeError('getRulings', `HTTP ${res.status}: ${err}`, url);
        }

        const json = await res.json();
        console.log(
            `[STWDCFG] getRulings OK: ${res.status} ${Date.now() - t0}ms`
        );
        return json;
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[STWDCFG] getRulings NETWORK ERROR:`, msg);
        return makeError('getRulings', `NETWORK ERROR: ${msg}`, url);
    }
}

async function getDriverRulings(
    league: string,
    season: string,
    discordUserId: string,
    authHeader: string
) {
    const url = `${BASE_URL}/rulings/${league}/${season}/driver/${discordUserId}`;
    console.log('[STWDCFG] getDriverRulings → GET', url);
    try {
        const t0 = Date.now();
        const res = await fetch(url, {
            method: 'GET',
            headers: { Authorization: authHeader },
        });

        if (!res.ok) {
            const err = await res.text();
            console.error(
                `[STWDCFG] getDriverRulings FAILED: ${res.status} ${
                    Date.now() - t0
                }ms`,
                err
            );
            return makeError(
                'getDriverRulings',
                `HTTP ${res.status}: ${err}`,
                url
            );
        }

        const json = await res.json();
        console.log(
            `[STWDCFG] getDriverRulings OK: ${res.status} ${Date.now() - t0}ms`
        );
        return json;
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[STWDCFG] getDriverRulings NETWORK ERROR:`, msg);
        return makeError('getDriverRulings', `NETWORK ERROR: ${msg}`, url);
    }
}

async function getStewardConfig(league: string, authHeader: string) {
    const url = `${BASE_URL}/steward-config/${league}`;
    console.log('[STWDCFG] getStewardConfig → GET', url);
    try {
        const t0 = Date.now();
        const res = await fetch(url, {
            method: 'GET',
            headers: { Authorization: authHeader },
        });

        if (!res.ok) {
            const err = await res.text();
            console.error(
                `[STWDCFG] getStewardConfig FAILED: ${res.status} ${
                    Date.now() - t0
                }ms`,
                err
            );
            return makeError(
                'getStewardConfig',
                `HTTP ${res.status}: ${err}`,
                url
            );
        }

        const json = await res.json();
        console.log(
            `[STWDCFG] getStewardConfig OK: ${res.status} ${Date.now() - t0}ms`
        );
        return json;
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[STWDCFG] getStewardConfig NETWORK ERROR:`, msg);
        return makeError('getStewardConfig', `NETWORK ERROR: ${msg}`, url);
    }
}

async function updStewardConfig(
    league: string,
    raceControlChannelId: string,
    authHeader: string
) {
    const url = `${BASE_URL}/steward-config/${league}`;
    console.log('[STWDCFG] updStewardConfig → PUT', url, {
        raceControlChannelId,
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
                race_control_channel_id: raceControlChannelId,
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            console.error(
                `[STWDCFG] updStewardConfig FAILED: ${res.status} ${
                    Date.now() - t0
                }ms`,
                err
            );
            return makeError(
                'updStewardConfig',
                `HTTP ${res.status}: ${err}`,
                url
            );
        }

        const json = await res.json();
        console.log(
            `[STWDCFG] updStewardConfig OK: ${res.status} ${Date.now() - t0}ms`
        );
        return json;
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[STWDCFG] updStewardConfig NETWORK ERROR:`, msg);
        return makeError('updStewardConfig', `NETWORK ERROR: ${msg}`, url);
    }
}

export async function stewardConfigHandler(
    namespace: string,
    query: any
): Promise<any> {
    console.log('[STWDCFG] stewardConfigHandler()', {
        type: query?.type,
        BASE_URL,
    });

    const q = query;
    const authHeader = q?._authHeader || '';

    switch (q?.type) {
        case 'getRulings':
            return await getRulings(q?.league, q?.season, authHeader);
        case 'getDriverRulings':
            return await getDriverRulings(
                q?.league,
                q?.season,
                q?.discordUserId,
                authHeader
            );
        case 'getStewardConfig':
            return await getStewardConfig(q?.league, authHeader);
        case 'updStewardConfig':
            return await updStewardConfig(
                q?.league,
                q?.raceControlChannelId,
                authHeader
            );
    }

    return null;
}
