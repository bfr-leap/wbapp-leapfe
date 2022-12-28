import type {
    TrackStats,
    M_Member,
    TrackInfoDirectory,
    LeagueSeasons,
    BlockedSeasons,
    ActiveLeagueSchedule,
    SeasonSimsessionIndex,
} from './iracing-endpoints';

export async function fetchObjects(urls: string[]): Promise<any[]> {
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

const _singleMemberDataCache: { [name: string]: M_Member } = {};
export async function getSingleMemberData(custId: string): Promise<M_Member> {
    let ret: M_Member = _singleMemberDataCache[custId];

    if (!ret) {
        [ret] = <[M_Member]>(
            await fetchObjects([
                `./data/derived/singleMemberData_${custId}.json`,
            ])
        );

        _singleMemberDataCache[custId] = ret;
    }

    return ret;
}

const _trackStatsCache: { [name: string]: TrackStats } = {};
export async function getTrackStats(
    leagueId: string,
    carId: string,
    trackId: string
): Promise<TrackStats> {
    let key = `${leagueId}_${carId}_${trackId}`;

    let trackResults: TrackStats = _trackStatsCache[key];

    if (!trackResults) {
        [trackResults] = <[TrackStats]>(
            await fetchObjects([`./data/derived/trackResults_${key}.json`])
        );

        _trackStatsCache[key] = trackResults;
    }

    return trackResults;
}

const _trackInfoDirectory: { [name: string]: Promise<any[]> } = {};
export async function getTrackInfoDirectory(
    leagueId: string
): Promise<TrackInfoDirectory> {
    let p = _trackInfoDirectory[leagueId];

    if (!p) {
        p = fetchObjects([
            `./data/derived/trackInfoDirectory_${leagueId}.json`,
        ]);

        _trackInfoDirectory[leagueId] = p;
    }

    let a = await p;

    let trackInfoDirectory = a[0];

    return trackInfoDirectory;
}

const _leagueSimsessionIndexCache: {
    [name: string]: Promise<any[]>;
} = {};
export async function getLeagueSimsessionIndex(
    leagueId: string
): Promise<SeasonSimsessionIndex[]> {
    let p = _leagueSimsessionIndexCache[leagueId];

    if (!p) {
        p = fetchObjects([
            `./data/derived/leagueSimsessionIndex_${leagueId}.json`,
        ]);
        _leagueSimsessionIndexCache[leagueId] = p;
    }

    let a = await p;
    let leagueSimsessionIndex = <SeasonSimsessionIndex[]>a[0];
    return leagueSimsessionIndex;
}

const _leagueSeasons: { [name: string]: LeagueSeasons } = {};
export async function getLeagueSeasons(
    leagueId: string
): Promise<LeagueSeasons> {
    let leagueSeasons = _leagueSeasons[leagueId];

    if (!leagueSeasons) {
        [leagueSeasons] = <[LeagueSeasons]>(
            await fetchObjects([
                `./data/scraped/leagueSeasons_${leagueId}.json`,
            ])
        );

        _leagueSeasons[leagueId] = leagueSeasons;
    }

    return leagueSeasons;
}

let _blockedSeasons: BlockedSeasons | null = null;
export async function getBlockedSeasons(): Promise<BlockedSeasons> {
    if (_blockedSeasons) {
        return _blockedSeasons;
    }

    [_blockedSeasons] = <[BlockedSeasons]>(
        await fetchObjects([`./data/curated/blockedSeasons.json`])
    );

    return _blockedSeasons;
}

let _activeLeagues: ActiveLeagueSchedule | null;
export async function getActiveLeagueSchedule(): Promise<ActiveLeagueSchedule> {
    if (_activeLeagues) {
        return _activeLeagues;
    }

    [_activeLeagues] = <[ActiveLeagueSchedule]>(
        await fetchObjects([`./data/curated/activeLeagueSchedule.json`])
    );

    return _activeLeagues;
}
