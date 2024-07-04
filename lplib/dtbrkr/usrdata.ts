import { getXataClient, XataClient } from './xata';

async function getIrLinkState(userID: string): Promise<any> {
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

async function updIrLinkDriver(userID: string, irCustID: string): Promise<any> {
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

async function updIrLinkCode(userID: string, verifyCode: string): Promise<any> {
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

export async function userDataHandler(req: any, res: any) {
    const q: {
        [name: string]: string | number
    } = req?.query || {};

    if ('irLinkState' === q?.type) {
        res.status(200).json({ doc: await getIrLinkState(req?.user?.id || "") });
    } else if ('irLinkDriverUpd' === q?.type) {
        res.status(200).json({ doc: await updIrLinkDriver(req?.user?.id || "", req?.query?.driver || "") });
    } else if ('irLinkCodeUpd' === q?.type) {
        res.status(200).json({ doc: await updIrLinkCode(req?.user?.id || "", req?.query?.code || "") });
    }
}