import { middleware as authMiddleware } from './middleware/_auth-user';
import { getDocument } from '../lplib/dtbrkr/ftchdata';

import { userDataHandler } from '../lplib/dtbrkr/usrdata';

export default async function handle(req: any, res: any) {
    let handled = false;
    await authMiddleware(req, res, async (rq, rs) => {
        handled = true;
        await prefetch(rq, rs);
    })

    if (!handled) {
        await prefetch(req, res);
    }
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

    let r: any = {};

    switch (q.m) {
        case '':
            r = await preFetchHome(q);
    }

    console.log('prefetch(): done');

    res.status(200).json({ docs: r });
}

async function getDefaultLeagueSeason(userID: string): Promise<{ league: number, season: number }> {
    console.log('getDefaultLeagueSeason()', userID);
    if (!userID) {
        return { league: 6555, season: 99410 };
    }

    const defaultLeagueSeason = await userDataHandler('', { type: 'defaultLeagueSeason', userID });
    console.log(defaultLeagueSeason);
    return { league: defaultLeagueSeason.league_id, season: defaultLeagueSeason.season_id };

}

async function preFetchHome(query: { [name: string]: string | number }) {
    // let league = query.league || 6555;
    // let season = query.season || 99410;

    let league = query.league;
    let season = query.season;

    if (!league || !season) {
        const def = await getDefaultLeagueSeason(<string>query.userID);
        league = def.league;
        season = def.season;
    }

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
