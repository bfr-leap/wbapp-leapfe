const BASE_URL =
    process.env.LEAP_DATA_BROKER_BASE_URL || 'http://98.116.118.25:3030/api';

export async function getDefaultLeagueSeason(user_id: string): Promise<any> {
    console.log('::: getDefaultLeagueSeason()', user_id);

    const url = `${BASE_URL}/user/${user_id}/default-league-season`;
    try {
        let objs = await fetch(url);
        let obj = await objs.json();
        console.log('::: ', JSON.stringify(obj));
        return obj;
    } catch (e) {
        console.log('::: error reaching proxy');
        return [];
    }
}

export async function userFeatures(user_id: string): Promise<any> {
    console.log('::: userFeatures(): ', user_id, 'proxy');
    const url = `${BASE_URL}/user/${user_id}/features`;
    try {
        let objs = await fetch(url);
        let obj = await objs.json();
        return obj;
    } catch (e) {
        console.log('::: error reaching proxy');
        return [];
    }
}

export async function getIrLinkState(user_id: string): Promise<any> {
    console.log('::: getIrLinkState():', user_id, 'proxy');
    const url = `${BASE_URL}/user/${user_id}/ir-link-state`;
    try {
        let objs = await fetch(url);
        let obj = await objs.json();
        return obj;
    } catch (e) {
        console.log('::: error reaching proxy');
        return {
            isVerified: false,
            irCustId: '',
            msgSent: false,
        };
    }
}

async function updIrLinkDriver(
    ir_cust_id: string,
    authHeader: string
): Promise<any> {
    const url = `${BASE_URL}/user/ir-link/driver`;
    console.log('[USRDATA] updIrLinkDriver → PUT', url, {
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
            body: JSON.stringify({ driver: ir_cust_id }),
        });

        if (!res.ok) {
            const err = await res.text();
            console.error(
                `[USRDATA] updIrLinkDriver FAILED: ${res.status} ${
                    Date.now() - t0
                }ms`,
                err
            );
            return {
                _error: true,
                _source: 'updIrLinkDriver',
                _message: `HTTP ${res.status}: ${err}`,
                _url: url,
            };
        }

        const json = await res.json();
        console.log(
            `[USRDATA] updIrLinkDriver OK: ${res.status} ${Date.now() - t0}ms`
        );
        return json;
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(
            `[USRDATA] updIrLinkDriver NETWORK ERROR (BASE_URL=${BASE_URL}):`,
            msg
        );
        return {
            _error: true,
            _source: 'updIrLinkDriver',
            _message: `NETWORK ERROR: ${msg}`,
            _url: url,
            _baseUrl: BASE_URL,
        };
    }
}

async function updIrLinkCode(
    verify_code: string,
    authHeader: string
): Promise<any> {
    const url = `${BASE_URL}/user/ir-link/verify`;
    console.log('[USRDATA] updIrLinkCode → PUT', url, {
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
            body: JSON.stringify({ code: verify_code }),
        });

        if (!res.ok) {
            const err = await res.text();
            console.error(
                `[USRDATA] updIrLinkCode FAILED: ${res.status} ${
                    Date.now() - t0
                }ms`,
                err
            );
            return {
                _error: true,
                _source: 'updIrLinkCode',
                _message: `HTTP ${res.status}: ${err}`,
                _url: url,
            };
        }

        const json = await res.json();
        console.log(
            `[USRDATA] updIrLinkCode OK: ${res.status} ${Date.now() - t0}ms`
        );
        return json;
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(
            `[USRDATA] updIrLinkCode NETWORK ERROR (BASE_URL=${BASE_URL}):`,
            msg
        );
        return {
            _error: true,
            _source: 'updIrLinkCode',
            _message: `NETWORK ERROR: ${msg}`,
            _url: url,
            _baseUrl: BASE_URL,
        };
    }
}

async function getUserLeaguesState(user_id: string): Promise<any> {
    console.log('::: getUserLeaguesState():', user_id, 'proxy');
    const url = `${BASE_URL}/user/${user_id}/leagues`;
    try {
        let objs = await fetch(url);
        let obj = await objs.json();
        return obj;
    } catch (e) {
        console.log('::: error reaching proxy');
        return {};
    }
}

async function updUserLeaguesState(
    code: string,
    authHeader: string
): Promise<any> {
    const url = `${BASE_URL}/user/leagues`;
    console.log('[USRDATA] updUserLeaguesState → PUT', url, {
        code,
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
            body: JSON.stringify({ code }),
        });

        if (!res.ok) {
            const err = await res.text();
            console.error(
                `[USRDATA] updUserLeaguesState FAILED: ${res.status} ${
                    Date.now() - t0
                }ms`,
                err
            );
            return {
                _error: true,
                _source: 'updUserLeaguesState',
                _message: `HTTP ${res.status}: ${err}`,
                _url: url,
            };
        }

        const json = await res.json();
        console.log(
            `[USRDATA] updUserLeaguesState OK: ${res.status} ${
                Date.now() - t0
            }ms`
        );
        return json;
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(
            `[USRDATA] updUserLeaguesState NETWORK ERROR (BASE_URL=${BASE_URL}):`,
            msg
        );
        return {
            _error: true,
            _source: 'updUserLeaguesState',
            _message: `NETWORK ERROR: ${msg}`,
            _url: url,
            _baseUrl: BASE_URL,
        };
    }
}

async function defLgSeasSubCtx(
    userID: string,
    league: string,
    season: string,
    subsession: string
): Promise<any> {
    console.log('::: defLgSeasSubCtx()', userID, league, subsession, 'proxy');
    const url = `${BASE_URL}/user/${userID}/context?league=${league}&season=${season}&subsession=${subsession}`;
    try {
        let objs = await fetch(url);
        let obj = await objs.json();
        return obj;
    } catch (e) {
        console.log('::: error reaching proxy');
        return {
            league_id: '4534',
            season_id: '111025',
            subsession_id: '',
            simsession_id: '',
        };
    }
}

export async function userDataHandler(
    namespace: string,
    query: any
): Promise<any> {
    console.log(':: userDataHandler()');

    const q = query;
    const authHeader = q?._authHeader || '';

    let doc: any = null;

    switch (q?.type) {
        case 'irLinkState':
            doc = await getIrLinkState(q?.userID || '');
            break;
        case 'irLinkDriverUpd':
            doc = await updIrLinkDriver(q?.driver || '', authHeader);
            break;
        case 'irLinkCodeUpd':
            doc = await updIrLinkCode(q?.code || '', authHeader);
            break;
        case 'userLeagues':
            doc = await getUserLeaguesState(q?.userID || '');
            break;
        case 'userLeaguesUpd':
            doc = await updUserLeaguesState(q?.code || '', authHeader);
            break;
        case 'defaultLeagueSeason':
            doc = await getDefaultLeagueSeason(q?.userID);
            break;
        case 'defLgSeasSubCtx':
            doc = await defLgSeasSubCtx(
                q?.userID || '',
                q?.league || '',
                q?.season || '',
                q?.subsession || ''
            );
            break;
        case 'userFeatures':
            doc = await userFeatures(q?.userID || '');
            break;
    }

    return doc;
}
