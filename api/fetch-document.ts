import { middleware as authMiddleware } from './middleware/_auth-user';
import { User } from '@clerk/clerk-sdk-node';
import { getXataClient, XataClient } from './_xata';

async function fetchObjects(urls: string[]): Promise<any[]> {
    try {
        let objs = await Promise.all(
            (
                await Promise.all(urls.map((url) => fetch(url)))
            ).map((response) => response.json())
        );

        return objs;
    } catch (e) {
        return urls.map((v) => null);
    }
}

function ldArg(arg: string | number | undefined): string {
    return (arg) ? '/' + arg : '';
}

function nNums(n: any): string {
    return n.toString().replace('-', 'n');
}

async function getIrLinkState(req: any): Promise<any> {
    const ret = {
        isVerified: false,
        irCustId: '',
        msgSent: false,
    };

    const u: User = req.user;
    const xata: XataClient = getXataClient();
    const userLink = await xata.db.IRCustIDMapping.select([
        "userID",
        "irCustID",
        "verifyCode",
        "isVerified",
        "msgSent"
    ]).filter({ userID: u.id }).getFirst();

    if (null !== userLink) {
        ret.isVerified = userLink.isVerified === true;
        ret.irCustId = userLink.irCustID || '';
        ret.msgSent = userLink.msgSent === true;
    }

    return ret;
}

async function getIrLinkDriver(req: any): Promise<any> {
    const q: {
        [name: string]: string | number
    } = req?.query || {};

    const driver = q.driver;
    const u: User = req.user;
    const xata: XataClient = getXataClient();
    const userLink = await xata.db.IRCustIDMapping.select([
        "userID"
    ]).filter({ userID: u.id }).getFirst();

    if (userLink) {
        userLink.delete();
    }

    const record = await xata.db.IRCustIDMapping.create({
        userID: u.id,
        verifyCode: 443223,
        irCustID: q.driver.toString()
    });

    return {};
}

async function getIrLinkCode(req: any): Promise<any> {
    console.log('link code');
    const q: {
        [name: string]: string | number
    } = req?.query || {};

    const u: User = req.user;
    const xata: XataClient = getXataClient();
    const userLink = await xata.db.IRCustIDMapping.select([
        "id",
        "userID",
        "verifyCode",
        "isVerified",
    ]).filter({ userID: u.id }).getFirst();

    if (null !== userLink && userLink.verifyCode?.toString() === q.code) {
        console.log('updating record');
        await userLink.update({ isVerified: true });
    }

    console.log('link code done');

    return {};
}

async function userDataHandler(req: any, res: any) {
    const q: {
        [name: string]: string | number
    } = req?.query || {};

    if ('irLinkState' === q.type) {
        res.status(200).json({ doc: await getIrLinkState(req) });
    } else if ('irLinkDriver' === q.type) {
        res.status(200).json({ doc: await getIrLinkDriver(req) });
    } else if ('irLinkCode' === q.type) {
        res.status(200).json({ doc: await getIrLinkCode(req) });
    }
}

export default async function handler(req: any, res: any) {
    const q: {
        [name: string]: string | number
    } = req?.query || {};

    if ('ldata-usrdata' === q.namespace) {
        return await authMiddleware(req, res, userDataHandler);
    }

    const url = `https://arturo-mayorga.github.io/irl_stats/dist/data/${q.namespace + '/'
        }${q.type
        }${ldArg(q.league)
        }${ldArg(q.season)
        }${ldArg(q.subsession)
        }${nNums(ldArg(q.simsession))
        }${ldArg(q.driver)
        }${ldArg(q.car)
        }${ldArg(q.track)
        }${ldArg(q.sessionType)
        }${ldArg(q.custId)
        }.json`;

    console.log(`fetch: ${url}`);

    const hc = await fetchObjects([url]);

    res.status(200).json({ doc: hc[0] });
}