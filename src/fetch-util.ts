import type {
    TrackStats,
    M_Member,
    TrackInfoDirectory,
    LeagueSeasons,
    BlockedSeasons,
    ActiveLeagueSchedule,
    SeasonSimsessionIndex,
    LeagueSeasonSessions,
    SimsessionResults,
    DriverStatsMap,
    CuratedLeagueTeamsInfo,
    MembersData,
    DriverResults,
    LapChartData,
    ST_DriverTelemetry,
} from './iracing-endpoints';

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

type CacheStorage = {
    [name: string]: Promise<any[]>;
};
let _cacheStorage: CacheStorage = {};
async function fetchCachedObject<T>(source: string): Promise<T> {
    let p = _cacheStorage[source];

    if (!p) {
        p = fetchObjects([source]);
        _cacheStorage[source] = p;
    }

    let a = await p;
    let leagueSimsessionIndex = <SeasonSimsessionIndex[]>a[0];
    return <T>JSON.parse(JSON.stringify(leagueSimsessionIndex));
}

export async function getSingleMemberData(custId: string): Promise<M_Member> {
    return await fetchCachedObject<M_Member>(
        `./data/derived/singleMemberData_${custId}.json`
    );
}

export async function getTrackStats(
    leagueId: string,
    carId: string,
    trackId: string
): Promise<TrackStats> {
    return await fetchCachedObject<TrackStats>(
        `./data/derived/trackResults_${leagueId}_${carId}_${trackId}.json`
    );
}

export async function getTrackInfoDirectory(
    leagueId: string
): Promise<TrackInfoDirectory> {
    return await fetchCachedObject<TrackInfoDirectory>(
        `./data/derived/trackInfoDirectory_${leagueId}.json`
    );
}

export async function getLeagueSeasonSessions(
    leagueId: string,
    seasonId: string
): Promise<LeagueSeasonSessions> {
    return await fetchCachedObject<LeagueSeasonSessions>(
        `./data/scraped/leagueSeasonSessions_${leagueId}_${seasonId}.json`
    );
}

export async function getSimsessionResults(
    subsessionId: string,
    simsessionNumber: string
): Promise<SimsessionResults> {
    return await fetchCachedObject<SimsessionResults>(
        `./data/derived/simSessionResults_${subsessionId}_${simsessionNumber}.json`
    );
}

export async function getLeagueSimsessionIndex(
    leagueId: string
): Promise<SeasonSimsessionIndex[]> {
    return await fetchCachedObject<SeasonSimsessionIndex[]>(
        `./data/derived/leagueSimsessionIndex_${leagueId}.json`
    );
}

export async function getLeagueSeasons(
    leagueId: string
): Promise<LeagueSeasons> {
    return await fetchCachedObject<LeagueSeasons>(
        `./data/scraped/leagueSeasons_${leagueId}.json`
    );
}

export async function getCuratedBlockedSeasons(): Promise<BlockedSeasons> {
    return await fetchCachedObject<BlockedSeasons>(
        `./data/curated/blockedSeasons.json`
    );
}

export async function getCuratedActiveLeagueSchedule(): Promise<ActiveLeagueSchedule> {
    return await fetchCachedObject<ActiveLeagueSchedule>(
        `./data/curated/activeLeagueSchedule.json`
    );
}

export async function getLeagueDriverStats(
    leagueId: string
): Promise<{ [name: number]: DriverStatsMap }> {
    return await fetchCachedObject<{ [name: number]: DriverStatsMap }>(
        `./data/derived/leagueDriverStats_${leagueId}.json`
    );
}

export async function getCuratedLeagueTeamsInfo(
    leagueId: string
): Promise<CuratedLeagueTeamsInfo> {
    return await fetchCachedObject<CuratedLeagueTeamsInfo>(
        `./data/curated/leagueTeamsInfo_${leagueId}.json`
    );
}

export async function getMembersData(
    leagueId: string,
    seasonId: string
): Promise<MembersData> {
    return await fetchCachedObject<MembersData>(
        `./data/scraped/membersData_${leagueId}_${seasonId}.json`
    );
}

export async function getSeasonSimsessionIndex(
    leagueId: string
): Promise<SeasonSimsessionIndex[]> {
    return await fetchCachedObject<SeasonSimsessionIndex[]>(
        `./data/derived/leagueSimsessionIndex_${leagueId}.json`
    );
}

export async function getDriverResults(
    driverId: string,
    sessionType: 'race' | 'sprint' | 'quali'
): Promise<DriverResults> {
    return await fetchCachedObject<DriverResults>(
        `./data/derived/driverSessionResults_${sessionType}_${driverId}.json`
    );
}

export async function getLapChartData(
    subsession: string,
    simsession: string
): Promise<LapChartData> {
    return await fetchCachedObject<LapChartData>(
        `./data/scraped/lapChartData_${subsession}_${simsession}.json`
    );
}

export async function getSimsessionDriverTelemetry(
    subssesion: string,
    simsession: string,
    driver: string
): Promise<ST_DriverTelemetry> {
    return await fetchCachedObject<ST_DriverTelemetry>(
        `./data/derived/simsessionDriverTelemetry_${subssesion}_${simsession}_${driver}.json`
    );
}

export async function getTelemetrySubsessionIds(
    league: string
): Promise<number[]> {
    return await fetchCachedObject<number[]>(
        `./data/curated/telemetrySubsessions_${league}.json`
    );
}
