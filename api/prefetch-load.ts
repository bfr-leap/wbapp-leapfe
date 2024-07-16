import { middleware as authMiddleware } from './middleware/_auth-user';
import { getDocument } from '../lplib/dtbrkr/ftchdata';

import { userDataHandler } from '../lplib/dtbrkr/usrdata';

export default async function handle(req: any, res: any) {
    let authorizationHeader = req?.headers?.authorization || 'Bearer null';
    const token = authorizationHeader.replace('Bearer ', '');

    if ('null' !== token) {
        await authMiddleware(req, res, async (rq, rs) => {
            await prefetch(rq, rs);
        });
    } else {
        await prefetch(req, res);
    }
}

async function defLgSeasSubCtx(req: any): Promise<any> {
    const q = {
        namespace: 'ldata-usrcfg', type: `defLgSeasSubCtx`,
        league: req.query.league, season: req.query.season, subsession: req.query.subsession
    };

    const lgSeasSubCtx = await getDocument(q.namespace, q);
    req.query.league = lgSeasSubCtx.league_id;
    req.query.season = lgSeasSubCtx.season_id;
    req.query.subsession = lgSeasSubCtx.subsession_id;

    return lgSeasSubCtx;
}

async function prefetch(req: any, res: any) {
    console.log('prefetch(): start');
    const q: {
        [name: string]: string | number
    } = req?.query || {};

    q.m = q?.m || '';

    if (req?.user) {
        q.userID = req.user.id;
    }

    const ctxKey = `/api/fetch-document?namespace=ldata-usrcfg&type=defLgSeasSubCtx&league=${req?.query?.league || ''}&season=${req?.query?.season || ''}&subsession=${req?.query?.subsession || ''}`;
    const lgSeasSubCtx = await defLgSeasSubCtx(req);

    let r: any = {};

    switch (q.m) {
        case '':
            r = await preFetchHome(q);
    }

    console.log('prefetch(): done');

    r[ctxKey] = lgSeasSubCtx;

    res.status(200).json({ docs: r });
}

async function preFetchHome(query: { [name: string]: string | number }) {
    let league = query.league;
    let season = query.season;

    let queries: { [name: string]: string | number }[] = [
        { namespace: `ldata-usrcfg`, type: `activeLeagueSchedule` },
        { namespace: `ldata-irweb`, type: `blockedSeasons` },
        { namespace: `ldata-rsltsts`, type: `leagueDriverStats`, league },
        { namespace: `ldata-irweb`, type: `leagueSeasonSessions`, league, season },
        { namespace: `ldata-usrcfg`, type: `leagueTeamsInfo`, league },
        { namespace: `ldata-rsltsts`, type: `leagueSimsessionIndex`, league },
        { namespace: `ldata-irweb`, type: `leagueSeasons`, league },
        { namespace: `ldata-irweb`, type: `membersData`, league, season },
        { namespace: `ldata-usrcfg`, type: `trackDisplayInfo` }
    ];

    let urlKeys = [
        `/api/fetch-document?namespace=ldata-usrcfg&type=activeLeagueSchedule`,
        `/api/fetch-document?namespace=ldata-irweb&type=blockedSeasons`,
        `/api/fetch-document?namespace=ldata-rsltsts&type=leagueDriverStats&league=${league}`,
        `/api/fetch-document?namespace=ldata-irweb&type=leagueSeasonSessions&league=${league}&season=${season}`,
        `/api/fetch-document?namespace=ldata-usrcfg&type=leagueTeamsInfo&league=${league}`,
        `/api/fetch-document?namespace=ldata-rsltsts&type=leagueSimsessionIndex&league=${league}`,
        `/api/fetch-document?namespace=ldata-irweb&type=leagueSeasons&league=${league}`,
        `/api/fetch-document?namespace=ldata-irweb&type=membersData&league=${league}&season=${season}`,
        `/api/fetch-document?namespace=ldata-usrcfg&type=trackDisplayInfo`
    ];

    const hc = await Promise.all(queries.map((q) => getDocument(q.namespace.toString(), q)));

    let r: { [namea: string]: any } = {};

    for (let i = 0; i < queries.length; ++i) {
        let url = urlKeys[i];
        r[url] = hc[i];
    }

    return r;
}
