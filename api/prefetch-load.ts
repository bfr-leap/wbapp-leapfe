export default async function handler(req, res) {
    const q: {
        [name: string]: string | number
    } = req?.query || {};

    console.log('pre-fetch:', JSON.stringify(q));

    q.m = q?.m || '';

    let r: any = {};

    switch (q.m) {
        case '':
            r = await preFetchHome(q);
    }

    res.status(200).json({ docs: r });
}

async function preFetchHome(query: { [name: string]: string | number }) {
    let league = query.league || 6555;
    let season = query.season || 99410;

    let mnt = 'https://arturo-mayorga.github.io/irl_stats/dist/data/';


    let urlNames = [
        `ldata-usrcfg/activeLeagueSchedule.json`,
        `ldata-irweb/blockedSeasons.json`,
        `ldata-rsltsts/leagueDriverStats/${league}.json`,
        `ldata-irweb/leagueSeasonSessions/${league}/${season}.json`,
        `ldata-usrcfg/leagueTeamsInfo/${league}.json`,
        `ldata-rsltsts/leagueSimsessionIndex/${league}.json`,
        `ldata-irweb/leagueSeasons/${league}.json`,
        `ldata-irweb/membersData/${league}/${season}.json`,
        `ldata-usrcfg/trackDisplayInfo.json`
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

    const hc = await fetchObjects(urlNames.map(v => `${mnt}${v}`));

    
    let r = {};

    for (let i = 0; i < urlNames.length; ++i) {
        let url = urlKeys[i];
        r[url] = hc[i];

    }

    return r;
}

async function toPromise(v: any): Promise<any> {
    return v;
}

async function fetchObjects(urls: string[]): Promise<any[]> {
    console.log("pre-fetch:", JSON.stringify(urls, null, '  '));
    try {
        let x = (
            await Promise.all(urls.map((url) => fetch(url)))
        ).map(async (response) => { 
            try {
                console.log('in try');
                let r = await response.json();
                console.log('ret');
                return toPromise(r);
            } catch(e){
                console.log('catching');
                return toPromise(null);
            } 
            return toPromise(null);
        });

        let objs = await Promise.all(
            x
        );

        // console.log(objs);

        return objs;
    } catch (e) {
        console.log(e);
        return urls.map((v) => null);
    }
}
