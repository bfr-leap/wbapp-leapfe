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
    CuratedTrackDisplayhInfo,
    GeneratedSimsessionSummary,
    ChartTable
} from 'ir-endpoints-types';

function nNums(n: string): string {
    return n.toString().replace('-', 'n');
}

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
        `./data/ldata-rsltsts/singleMemberData/${custId}.json`
    );
}

export async function getTrackStats(
    leagueId: string,
    carId: string,
    trackId: string
): Promise<TrackStats> {
    return await fetchCachedObject<TrackStats>(
        `./data/ldata-rsltsts/trackResults/${leagueId}/${carId}/${trackId}.json`
    );
}

export async function getTrackInfoDirectory(
    leagueId: string
): Promise<TrackInfoDirectory> {
    return await fetchCachedObject<TrackInfoDirectory>(
        `./data/ldata-rsltsts/trackInfoDirectory/${leagueId}.json`
    );
}

export async function getSimsessionResults(
    subsessionId: string,
    simsessionNumber: string
): Promise<SimsessionResults> {
    return await fetchCachedObject<SimsessionResults>(
        `./data/ldata-rsltsts/simSessionResults/${subsessionId}/${nNums(
            simsessionNumber
        )}.json`
    );
}

export async function getLeagueSimsessionIndex(
    leagueId: string
): Promise<SeasonSimsessionIndex[]> {
    return await fetchCachedObject<SeasonSimsessionIndex[]>(
        `./data/ldata-rsltsts/leagueSimsessionIndex/${leagueId}.json`
    );
}

export async function getLeagueDriverStats(
    leagueId: string
): Promise<{ [name: number]: DriverStatsMap }> {
    return await fetchCachedObject<{ [name: number]: DriverStatsMap }>(
        `./data/ldata-rsltsts/leagueDriverStats/${leagueId}.json`
    );
}

export async function getDriverResults(
    leagueId: string,
    driverId: string,
    sessionType: 'race' | 'sprint' | 'quali'
): Promise<DriverResults> {
    return await fetchCachedObject<DriverResults>(
        `./data/ldata-rsltsts/driverSessionResults/${leagueId}/${sessionType}/${driverId}.json`
    );
}

export async function getSeasonSimsessionIndex(
    leagueId: string
): Promise<SeasonSimsessionIndex[]> {
    return await fetchCachedObject<SeasonSimsessionIndex[]>(
        `./data/ldata-rsltsts/leagueSimsessionIndex/${leagueId}.json`
    );
}

export async function getSimsessionDriverTelemetry(
    subssesion: string,
    simsession: string,
    driver: string
): Promise<ST_DriverTelemetry> {
    return await fetchCachedObject<ST_DriverTelemetry>(
        `./data/ldata-rsltsts/simsessionDriverTelemetry/${subssesion}/${nNums(
            simsession
        )}/${driver}.json`
    );
}

export async function getLeagueSeasonSessions(
    leagueId: string,
    seasonId: string
): Promise<LeagueSeasonSessions> {
    return await fetchCachedObject<LeagueSeasonSessions>(
        `./data/ldata-irweb/leagueSeasonSessions/${leagueId}/${seasonId}.json`
    );
}

export async function getLeagueSeasons(
    leagueId: string
): Promise<LeagueSeasons> {
    return await fetchCachedObject<LeagueSeasons>(
        `./data/ldata-irweb/leagueSeasons/${leagueId}.json`
    );
}

export async function getCuratedBlockedSeasons(): Promise<BlockedSeasons> {
    return await fetchCachedObject<BlockedSeasons>(
        `./data/ldata-irweb/blockedSeasons.json`
    );
}

export async function getMembersData(
    leagueId: string,
    seasonId: string
): Promise<MembersData> {
    return await fetchCachedObject<MembersData>(
        `./data/ldata-irweb/membersData/${leagueId}/${seasonId}.json`
    );
}

export async function getCumulativeDeltaBestLapChartData(
    leagueId: string,
    subsessionId: string,
    simsessionNumber: string): Promise<ChartTable> {
    return await fetchCachedObject<ChartTable>(
        `./data/ldata-charts/cumulativeDeltaBestLapChartData/${leagueId}/${subsessionId}/${nNums(
            simsessionNumber
        )}.json`
    );
}

export async function getPacePercentVsIdealLapChartData(
    leagueId: string, subsessionId: string, simsessionNumber: string
): Promise<ChartTable> {
    return await fetchCachedObject<ChartTable>(
        `./data/ldata-charts/pacePercentVsIdealLapChartData/${leagueId}/${subsessionId}/${nNums(
            simsessionNumber
        )}.json`
    );
}

export async function getPacePercentChartData(
    leagueId: string, subsessionId: string, simsessionNumber: string
): Promise<ChartTable> {
    return await fetchCachedObject<ChartTable>(
        `./data/ldata-charts/pacePercentChartData/${leagueId}/${subsessionId}/${nNums(
            simsessionNumber
        )}.json`
    );
}

export async function getStartFinishChartData(
    leagueId: string, subsessionId: string, simsessionNumber: string
): Promise<ChartTable> {
    return await fetchCachedObject<ChartTable>(
        `./data/ldata-charts/startFinishChartData/${leagueId}/${subsessionId}/${nNums(
            simsessionNumber
        )}.json`
    );
}

export async function getCumulativeDeltaChartData(
    leagueId: string, subsessionId: string, simsessionNumber: string
): Promise<ChartTable> {
    return await fetchCachedObject<ChartTable>(
        `./data/ldata-charts/cumulativeDeltaChartData/${leagueId}/${subsessionId}/${nNums(
            simsessionNumber
        )}.json`
    );
}

export async function getLapChartData(
    subsession: string,
    simsession: string
): Promise<LapChartData> {
    return await fetchCachedObject<LapChartData>(
        `./data/ldata-irweb/lapChartData/${subsession}/${nNums(
            simsession
        )}.json`
    );
}

export async function getTelemetrySubsessionIds(
    league: string
): Promise<number[]> {
    return await fetchCachedObject<number[]>(
        `./data/ldata-irrpy/telemetrySubsessions/${league}.json`
    );
}

export async function getCuratedActiveLeagueSchedule(): Promise<ActiveLeagueSchedule> {
    return await fetchCachedObject<ActiveLeagueSchedule>(
        `./data/ldata-usrcfg/activeLeagueSchedule.json`
    );
}

export async function getCuratedLeagueTeamsInfo(
    leagueId: string
): Promise<CuratedLeagueTeamsInfo> {
    return await fetchCachedObject<CuratedLeagueTeamsInfo>(
        `./data/ldata-usrcfg/leagueTeamsInfo/${leagueId}.json`
    );
}

export async function getCuratedTrackDisplayInfo(): Promise<CuratedTrackDisplayhInfo> {
    return await fetchCachedObject<CuratedTrackDisplayhInfo>(
        './data/ldata-usrcfg/trackDisplayInfo.json'
    );
}

export async function getGeneratedSimsessionSummary(
    subsessionId: number,
    simsessionNumber: number
): Promise<GeneratedSimsessionSummary> {
    return await fetchCachedObject<GeneratedSimsessionSummary>(
        `./data/ldata-gentxt/simsessionSummary/${subsessionId}/${simsessionNumber}.json`
    );
}
