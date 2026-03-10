/**
 * League data service — league metadata, seasons, members, and teams.
 */

import { fetchCachedDocument } from '@@/src/utils/api-client';
import type {
    TrackInfoDirectory,
    LeagueSeasons,
    BlockedSeasons,
    ActiveLeagueSchedule,
    SeasonSimsessionIndex,
    LeagueSeasonSessions,
    MembersData,
    CuratedLeagueTeamsInfo,
    CuratedTrackDisplayhInfo,
} from '@@/lplib/endpoint-types/iracing-endpoints';

export async function getLeagueSeasons(
    league: string
): Promise<LeagueSeasons | null> {
    const namespace = 'ldata-irweb';
    const type = 'leagueSeasons';
    return await fetchCachedDocument<LeagueSeasons>({
        namespace,
        type,
        league,
    });
}

export async function getCuratedBlockedSeasons(): Promise<BlockedSeasons | null> {
    const namespace = 'ldata-irweb';
    const type = 'blockedSeasons';
    return await fetchCachedDocument<BlockedSeasons>({ namespace, type });
}

export async function getMembersData(
    league: string,
    season: string
): Promise<MembersData | null> {
    const namespace = 'ldata-irweb';
    const type = 'membersData';
    return await fetchCachedDocument<MembersData>({
        namespace,
        type,
        league,
        season,
    });
}

export async function getLeagueSimsessionIndex(
    league: string
): Promise<SeasonSimsessionIndex[] | null> {
    const namespace = 'ldata-rsltsts';
    const type = 'leagueSimsessionIndex';
    let ret = await fetchCachedDocument<SeasonSimsessionIndex[]>({
        namespace,
        type,
        league,
    });

    // TODO: move to backend
    if (ret) {
        for (let season of ret) {
            season.sessions = season.sessions.filter((session) => {
                let hasRace = session.simsessions.reduce(
                    (p, c) => p || c.type === 'race',
                    false
                );
                return hasRace;
            });
        }
    }

    return ret;
}

export async function getSeasonSimsessionIndex(
    league: string
): Promise<SeasonSimsessionIndex[] | null> {
    const namespace = 'ldata-rsltsts';
    const type = 'leagueSimsessionIndex';
    return await fetchCachedDocument<SeasonSimsessionIndex[]>({
        namespace,
        type,
        league,
    });
}

export async function getLeagueSeasonSessions(
    league: string,
    season: string
): Promise<LeagueSeasonSessions | null> {
    const namespace = 'ldata-irweb';
    const type = 'leagueSeasonSessions';
    let ret = await fetchCachedDocument<LeagueSeasonSessions>({
        namespace,
        type,
        league,
        season,
    });

    // TODO: move this to the backend
    if (ret) {
        let ss = await getLeagueSimsessionIndex(league);
        let season_ = ss?.find(
            (v) => v.season_id.toString() === season
        );

        ret.sessions = ret.sessions.filter((v) => {
            let simsessions =
                season_?.sessions.find(
                    (ses) => ses.subsession_id === v.subsession_id
                )?.simsessions || [];
            let hasRace = simsessions.reduce((p, c) => {
                return p || c.type === 'race';
            }, false);

            return hasRace;
        });
    }

    return ret;
}

export async function getTrackInfoDirectory(
    league: string
): Promise<TrackInfoDirectory | null> {
    const namespace = 'ldata-rsltsts';
    const type = 'trackInfoDirectory';
    return await fetchCachedDocument<TrackInfoDirectory>({
        namespace,
        type,
        league,
    });
}

export async function getCuratedLeagueTeamsInfo(
    league: string
): Promise<CuratedLeagueTeamsInfo | null> {
    const namespace = 'ldata-usrcfg';
    const type = 'leagueTeamsInfo';
    return await fetchCachedDocument<CuratedLeagueTeamsInfo>({
        namespace,
        type,
        league,
    });
}

export async function getCuratedTrackDisplayInfo(): Promise<CuratedTrackDisplayhInfo | null> {
    const namespace = 'ldata-usrcfg';
    const type = 'trackDisplayInfo';
    return await fetchCachedDocument<CuratedTrackDisplayhInfo>({
        namespace,
        type,
    });
}

export async function getCuratedActiveLeagueSchedule(): Promise<ActiveLeagueSchedule | null> {
    const namespace = 'ldata-usrcfg';
    const type = 'activeLeagueSchedule';
    return await fetchCachedDocument<ActiveLeagueSchedule>({
        namespace,
        type,
    });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getLeagueRoster(league: string): Promise<any> {
    const namespace = 'ldata-irweb';
    const type = 'leagueRoster';
    return await fetchCachedDocument({ namespace, type, league });
}

export async function defLgSeasSubCtx(
    league: string = '',
    season: string = '',
    subsession: string = ''
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
    const namespace = 'ldata-usrcfg';
    const type = 'defLgSeasSubCtx';
    return await fetchCachedDocument({
        namespace,
        type,
        league,
        season,
        subsession,
    });
}
