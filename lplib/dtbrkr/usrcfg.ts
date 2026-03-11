const BASE_URL = 'http://98.116.118.25:3030/api';

export async function userConfigHandler(
    namespace: string,
    query: any
): Promise<any> {
    console.log(':: userConfigHandler()');

    const q = query;
    let doc: any = null;

    switch (q?.type) {
        case 'leagueTeamsInfo':
            doc = await getLeagueTeamsInfo(q?.league);
            break;
        case 'activeLeagueSchedule':
            doc = await getActiveLeagueSchedule();
            break;
        case 'trackDisplayInfo':
            doc = await getTrackDisplayInfo();
            break;
        case 'defLgSeasSubCtx':
            doc = await defLgSeasSubCtx(
                q?.league || '',
                q?.season || '',
                q?.subsession || ''
            );
            break;
    }

    console.log(':: returning document userConfigHandler()', q?.type);

    return doc;
}

async function getActiveLeagueSchedule(
    incJournalist: boolean = false
): Promise<any> {
    console.log('::: getActiveLeagueSchedule(): proxy'); 

    const url = `${BASE_URL}/config/active-league-schedule`;
    try {
        let objs = await fetch(url);
        let obj = await objs.json();
        return obj;
    } catch (e) {
        console.log('error reaching proxy');
        return {leagues:[]};
    }
}

async function getLeagueTeamsInfo(league: string): Promise<any> {
    console.log('::: getLeagueTeamsInfo(): [', league, '] proxy'); 

    const url = `${BASE_URL}/config/leagues/${league}/teams`;
    try {
        let objs = await fetch(url);
        let obj = await objs.json();
        return obj;
    } catch (e) {
        console.log('error reaching proxy');
        return { leageu_id: Number.parseInt(league, 10), seasons: []};
    }
}

async function getTrackDisplayInfo(): Promise<any> {
    console.log('::: getTrackDisplayInfo(): proxy');

    const url = `${BASE_URL}/config/tracks`;
    try {
        let objs = await fetch(url);
        let obj = await objs.json();
        return obj;
    } catch (e) {
        console.log('error reaching proxy');
        return {};
    }
}

async function defLgSeasSubCtx(
    league: string,
    season: string,
    subsession: string
): Promise<any> {
    console.log('::: defLgSeasSubCtx()', league, season, subsession, 'usrcfg proxy'); 

    const url = `${BASE_URL}/config/context?league=${league}&season=${season}&subsession=${subsession}`;
    try {
        let objs = await fetch(url);
        let obj = await objs.json();
        console.log('::: ', JSON.stringify(obj));
        return obj;
    } catch (e) {
        console.log('error reaching proxy');
        return { league_id: '4534', season_id: '111025', subsession_id: '', simsession_id: '' }; 
    }
}

