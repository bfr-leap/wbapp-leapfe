import { getDocument as getDataLakeDocument } from './dtlkdata';
import { getXataClient, XataClient } from './xata';
import type { UsersLeaguesInterestRecord } from './xata';

const BASE_URL = 'http://192.168.1.171:3030/api';

export async function getDefaultLeagueSeason(user_id: string): Promise<any> {
    console.log('::: getDefaultLeagueSeason()', user_id); // this is next


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
    console.log('::: getIrLinkState():', user_id, 'proxy'); // this is next
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

export async function updIrLinkDriver(
    user_id: string,
    ir_cust_id: string
): Promise<any> {
    console.log('::: updIrLinkDriver():', user_id);
    const xata: XataClient = getXataClient();
    const userLink = await xata.db.user_ir_cust_mappings
        .select(['user_id', 'try_count'])
        .filter({ user_id })
        .getFirst();

    let try_count = -1;

    if (userLink) {
        try_count = userLink.try_count;
        await userLink.delete();
    }

    ++try_count;

    const numDigits = 6;
    const verify_code =
        Number.parseInt(
            new Array(numDigits)
                .fill(0)
                .map((v) => Math.round(Math.random() * 9).toString())
                .join('')
        ) || 0;

    await xata.db.user_ir_cust_mappings.create({
        user_id,
        verify_code,
        ir_cust_id,
        try_count,
    });

    return {};
}

export async function updIrLinkCode(
    user_id: string,
    verify_code: string
): Promise<any> {
    console.log('::: updIrLinkCode():', user_id);
    const xata: XataClient = getXataClient();
    const userLink = await xata.db.user_ir_cust_mappings
        .select(['id', 'user_id', 'verify_code', 'is_verified', 'try_count'])
        .filter({ user_id })
        .getFirst();

    if (null !== userLink && userLink.verify_code?.toString() === verify_code) {
        console.log('::: updIrLinkCode() Success');
        await userLink.update({ is_verified: true });
    } else {
        console.log('::: updIrLinkCode() Fail');
        let try_count = 1 + (userLink?.try_count || 0);
        await userLink?.update({ try_count });
    }

    return {};
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
    user_id: string,
    code: string
): Promise<any> {
    console.log('::: updUserLeaguesState():', user_id, code);

    const codes = code.split('-').map((c) => Number.parseInt(c));

    let isValidInput: boolean = true;
    for (let c of codes) {
        if (isNaN(c)) {
            isValidInput = false;
            break;
        }
    }

    if (isValidInput) {
        const xata: XataClient = getXataClient();

        let s = {
            statement: `
                DELETE FROM "users_leagues_interest"
                WHERE "user_id" = '${user_id}'
                AND "league_id" NOT IN (${codes.join(', ')})
            `,
        };

        await xata.sql<UsersLeaguesInterestRecord>(s, []);

        s = {
            statement: `
                INSERT INTO "users_leagues_interest" ("user_id", "league_id")
                SELECT '${user_id}', "league_id"
                FROM (VALUES ${codes
                    .map((c) => `(${c})`)
                    .join(', ')}) AS ids("league_id")
                WHERE "league_id" NOT IN (
                    SELECT "league_id"
                    FROM "users_leagues_interest"
                    WHERE "user_id" = '${user_id}'
                );`,
        };

        await xata.sql<UsersLeaguesInterestRecord>(s, []);
    }

    return await getUserLeaguesState(user_id);
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
        return { league_id: '4534', season_id: '111025', subsession_id: '', simsession_id: '' }; 
    }
}

export async function userDataHandler(
    namespace: string,
    query: any
): Promise<any> {
    console.log(':: userDataHandler()');

    const q = query;

    let doc: any = null;

    switch (q?.type) {
        case 'irLinkState':
            doc = await getIrLinkState(q?.userID || '');
            break;
        case 'irLinkDriverUpd':
            doc = await updIrLinkDriver(q?.userID || '', q?.driver || '');
            break;
        case 'irLinkCodeUpd':
            doc = await updIrLinkCode(q?.userID || '', q?.code || '');
            break;
        case 'userLeagues':
            doc = await getUserLeaguesState(q?.userID || '');
            break;
        case 'userLeaguesUpd':
            doc = await updUserLeaguesState(q?.userID || '', q?.code || '');
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
