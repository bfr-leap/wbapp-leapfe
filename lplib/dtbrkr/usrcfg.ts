import { getXataClient, XataClient } from './xata';

async function getLeagueTeamsInfo(league: string): Promise<any> {
    console.log('getLeagueTeamsInfo():', league);
    const xata = getXataClient();

    const { records } = await xata.sql`
    SELECT "teams"."display_name", "teams"."id" as "team_id", "teams"."season_id", "teams_users"."ir_cust_id"
    FROM "teams"
    INNER JOIN "seasons" ON
    "seasons"."season_id"="teams"."season_id"
    INNER JOIN "teams_users" ON
    "teams"."id"="teams_users"."team_id"
    WHERE "seasons"."league_id"=${league}`;

    let ret = { leageu_id: Number.parseInt(league, 10), seasons: <any[]>[] };

    let seasonM: any = {};
    let teamM: any = {};

    for (let rec of <any>records) {
        let season = seasonM[rec.season_id];
        if (!season) {
            season = seasonM[rec.season_id] = { season_id: rec.season_id, teams: [] };
            ret.seasons.push(season);
        }

        let team = teamM[rec.team_id];
        if (!team) {
            team = teamM[rec.team_id] = {
                team_name: rec.display_name,
                team_id: rec.team_id,
                team_members: [],
            };
            season.teams.push(team);
        }

        team.team_members.push(rec.ir_cust_id);
    }

    return ret;
}

async function getActiveLeagueSchedule(): Promise<any> {
    console.log('getActiveLeagueSchedule():');

    const xata = getXataClient();

    const rt: any = await xata.sql`
    SELECT "sched_subsessions"."id", "seasons"."league_id", "leagues"."name" as "league_name", "car_id", "seasons"."display_name" as "season_name", "time", 
    "track_id", "sched_subsessions"."season_id", 
    "sched_subsessions"."display_name" as "event_name"
    FROM "sched_subsessions"
    INNER JOIN "seasons" ON
    "sched_subsessions"."season_id"="seasons"."season_id"
    INNER JOIN "leagues" ON
     "leagues"."league_id"="seasons"."league_id"
     WHERE "seasons"."is_active"`;

    let leaguesM: any = {};
    let seasonsM: any = {};
    let leagues = [];

    for (let r of rt.records) {
        let league = leaguesM[r.league_id];
        if (!league) {
            league = leaguesM[r.league_id] = {
                league_id: r.league_id,
                name: r.league_name,
                seasons: [],
            };
            leagues.push(league);
        }

        let season = seasonsM[r.season_id];
        if (!season) {
            season = seasonsM[r.season_id] = {
                season_id: r.season_id,
                car_id: r.car_id,
                comment: r.season_name,
                events: [],
            };
            league.seasons.push(season);
        }

        let event = { time: r.time, track_id: r.track_id, comment: r.event_name };
        season.events.push(event);
    }

    return { leagues };
}

async function getTrackDisplayInfo(): Promise<any> {
    console.log('getTrackDisplayInfo():');
    const xata = getXataClient();
    const records = await xata.sql`
        SELECT "display_name", "short_name", "track_id" 
        FROM "tracks"`;

    const ret: any = {};
    for (let t of <any>records.records) {
        ret[t.track_id] = { display: t.display_name, short_display: t.short_name };
    }

    return ret;
}

export async function userConfigHandler(namespace: string, query: any): Promise<any> {
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
    }

    return doc;
}