import { getXataClient, XataClient } from './xata';
import type { UsersLeaguesInterestRecord } from './xata';

export async function getIrLinkState(user_id: string): Promise<any> {
    console.log('getIrLinkState():', user_id);
    const ret = {
        isVerified: false,
        irCustId: '',
        msgSent: false,
    };

    const xata: XataClient = getXataClient();
    const userLink = await xata.db.user_ir_cust_mappings.select([
        "user_id", "ir_cust_id", "verify_code", "is_verified", "msg_sent"]).filter({ user_id }).getFirst();

    if (null !== userLink) {
        ret.isVerified = userLink.is_verified === true;
        ret.irCustId = userLink.ir_cust_id || '';
        ret.msgSent = userLink.msg_sent === true;
    }

    return ret;
}

export async function updIrLinkDriver(user_id: string, ir_cust_id: string): Promise<any> {
    console.log('updIrLinkDriver():', user_id);
    const xata: XataClient = getXataClient();
    const userLink = await xata.db.user_ir_cust_mappings
        .select(['user_id', 'try_count']).filter({ user_id }).getFirst();

    let try_count = -1;

    if (userLink) {
        try_count = userLink.try_count;
        await userLink.delete();
    }

    ++try_count

    const numDigits = 6;
    const verify_code = Number.parseInt(new Array(numDigits).fill(0).map(v => Math.round(Math.random() * 9).toString()).join('')) || 0;

    await xata.db.user_ir_cust_mappings.create({ user_id, verify_code, ir_cust_id, try_count });

    return {};
}

export async function updIrLinkCode(user_id: string, verify_code: string): Promise<any> {
    console.log('updIrLinkCode():', user_id);
    const xata: XataClient = getXataClient();
    const userLink = await xata.db.user_ir_cust_mappings.select([
        "id", "user_id", "verify_code", "is_verified", 'try_count']).filter({ user_id }).getFirst();

    if (null !== userLink && userLink.verify_code?.toString() === verify_code) {
        console.log('updIrLinkCode() Success');
        await userLink.update({ is_verified: true });
    } else {
        console.log('updIrLinkCode() Fail');
        let try_count = 1 + (userLink?.try_count || 0);
        await userLink?.update({ try_count });
    }

    return {};
}

async function getUserLeaguesState(user_id: string): Promise<any> {
    console.log('getUserLeaguesState():', user_id);
    try {
        const xata: XataClient = getXataClient();
        const { records } = await xata.sql<UsersLeaguesInterestRecord>`
        SELECT 
          "leagues"."name", 
          "leagues"."league_id",
          "short_name"
        FROM "users_leagues_interest"
        INNER JOIN "leagues" ON
          "users_leagues_interest"."league_id"="leagues"."league_id"
        WHERE "user_id"=${user_id}`;

        return records;
    } catch (e) {
        console.log(e);
    }

    return {};
}

async function updUserLeaguesState(user_id: string, code: string): Promise<any> {
    console.log('updUserLeaguesState():', user_id, code);

    const codes = code.split('-').map(c => Number.parseInt(c));

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
            `
        }

        await xata.sql<UsersLeaguesInterestRecord>(s, []);

        s = {
            statement: `
                INSERT INTO "users_leagues_interest" ("user_id", "league_id")
                SELECT '${user_id}', "league_id"
                FROM (VALUES ${codes.map(c => `(${c})`).join(', ')}) AS ids("league_id")
                WHERE "league_id" NOT IN (
                    SELECT "league_id"
                    FROM "users_leagues_interest"
                    WHERE "user_id" = '${user_id}'
                );`
        };

        await xata.sql<UsersLeaguesInterestRecord>(s, []);
    }

    return await getUserLeaguesState(user_id);
}

export async function userDataHandler(namespace: string, query: any): Promise<any> {
    const q = query;

    let doc: any = null;

    switch (q?.type) {
        case 'irLinkState':
            doc = await getIrLinkState(q?.userID || "");
            break;
        case 'irLinkDriverUpd':
            doc = await updIrLinkDriver(q?.userID || "", q?.driver || "");
            break;
        case 'irLinkCodeUpd':
            doc = await updIrLinkCode(q?.userID || "", q?.code || "");
            break;
        case 'userLeagues':
            doc = await getUserLeaguesState(q?.userID || "");
            break;
        case 'userLeaguesUpd':
            doc = await updUserLeaguesState(q?.userID || "", q?.code || "");
            break;
    }

    return doc;
}
