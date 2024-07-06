import { getXataClient, XataClient } from './xata';
import type { UserSelectedLeaguesRecord } from './xata';

export async function getIrLinkState(userID: string): Promise<any> {
    console.log('getIrLinkState()', userID);
    const ret = {
        isVerified: false,
        irCustId: '',
        msgSent: false,
    };

    const xata: XataClient = getXataClient();
    const userLink = await xata.db.IRCustIDMapping.select([
        "userID", "irCustID", "verifyCode", "isVerified", "msgSent"]).filter({ userID }).getFirst();

    if (null !== userLink) {
        ret.isVerified = userLink.isVerified === true;
        ret.irCustId = userLink.irCustID || '';
        ret.msgSent = userLink.msgSent === true;
    }

    return ret;
}

export async function updIrLinkDriver(userID: string, irCustID: string): Promise<any> {
    console.log('updIrLinkDriver()', userID);
    const xata: XataClient = getXataClient();
    const userLink = await xata.db.IRCustIDMapping.select(['userID', 'tryCount']).filter({ userID }).getFirst();

    let tryCount = -1;

    if (userLink) {
        tryCount = userLink.tryCount;
        await userLink.delete();
    }

    ++tryCount

    const numDigits = 6;
    const verifyCode = Number.parseInt(new Array(numDigits).fill(0).map(v => Math.round(Math.random() * 9).toString()).join('')) || 0;

    await xata.db.IRCustIDMapping.create({ userID, verifyCode, irCustID, tryCount });

    return {};
}

export async function updIrLinkCode(userID: string, verifyCode: string): Promise<any> {
    console.log('updIrLinkCode()', userID);
    const xata: XataClient = getXataClient();
    const userLink = await xata.db.IRCustIDMapping.select([
        "id", "userID", "verifyCode", "isVerified", 'tryCount']).filter({ userID }).getFirst();

    if (null !== userLink && userLink.verifyCode?.toString() === verifyCode) {
        console.log('updIrLinkCode() Success');
        await userLink.update({ isVerified: true });
    } else {
        console.log('updIrLinkCode() Fail');
        let tryCount = 1 + (userLink?.tryCount || 0);
        await userLink?.update({ tryCount });
    }

    return {};
}

async function getUserLeaguesState(userID: string): Promise<any> {
    console.log('getUserLeaguesState()', userID);
    try {
        const xata: XataClient = getXataClient();
        const { records } = await xata.sql<UserSelectedLeaguesRecord>`
        SELECT 
          "Leagues"."name", 
          "Leagues"."leagueID",
          "shortName"
        FROM "UserSelectedLeagues"
        INNER JOIN "Leagues" ON
          "UserSelectedLeagues"."leagueID"="Leagues"."leagueID"
        WHERE "userID"=${userID}`;

        return records;
    } catch (e) {
        console.log(e);
    }

    return {};
}

async function updUserLeaguesState(userID: string, code: string): Promise<any> {
    console.log('updUserLeaguesState()', userID, code);

    const codes = code.split('-').map(c => Number.parseInt(c));

    let isValidInput: boolean = true;
    for (let c of codes) {
        if (isNaN(c)) {
            isValidInput = false;
            break;
        }
    }

    console.log(codes);

    if (isValidInput) {

    }



    const ret = await getUserLeaguesState(userID);

    return ret;
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
    }

    return doc;
}
