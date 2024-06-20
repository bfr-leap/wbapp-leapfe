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
    source = 'https://arturo-mayorga.github.io/irl_stats/dist' + source;
    let p = _cacheStorage[source];

    if (!p) {
        p = fetchObjects([source]);
        _cacheStorage[source] = p;
    }

    let a = await p;
    let leagueSimsessionIndex = <SeasonSimsessionIndex[]>a[0];
    return <T>JSON.parse(JSON.stringify(leagueSimsessionIndex));
}

function prepUrl(args: { [name: string]: string | number }): string {
    let ret = [];
    let keys = Object.keys(args);
    for (let key of keys) {
        ret.push(`${key}=${args[key]}`);
    }

    return `/api/fetch-document?${ret.join('&')}`;
}

async function fetchCachedDocument<T>(args: { [name: string]: string | number }): Promise<T> {
    let source: string = prepUrl(args);
    let p = _cacheStorage[source];

    if (!p) {
        p = fetchObjects([source]);
        _cacheStorage[source] = p;
    }

    let a = await p;
    let leagueSimsessionIndex = <SeasonSimsessionIndex[]>a[0];
    return <T>(JSON.parse(JSON.stringify(leagueSimsessionIndex)).doc);
}

export async function getSingleMemberData(custId: string): Promise<M_Member> {
    const namespace = 'ldata-rsltsts';
    const type = 'singleMemberData';
    return await fetchCachedDocument<SeasonSimsessionIndex[]>({ namespace, type, custId });
}

export async function getTrackStats(
    leagueId: string,
    carId: string,
    trackId: string
): Promise<TrackStats> {
    return await fetchCachedObject<TrackStats>(
        `/data/ldata-rsltsts/trackResults/${leagueId}/${carId}/${trackId}.json`
    );
}

export async function getTrackInfoDirectory(
    leagueId: string
): Promise<TrackInfoDirectory> {
    return await fetchCachedObject<TrackInfoDirectory>(
        `/data/ldata-rsltsts/trackInfoDirectory/${leagueId}.json`
    );
}

export async function getSimsessionResults(
    subsessionId: string,
    simsessionNumber: string
): Promise<SimsessionResults> {
    return await fetchCachedObject<SimsessionResults>(
        `/data/ldata-rsltsts/simSessionResults/${subsessionId}/${nNums(
            simsessionNumber
        )}.json`
    );
}



export async function getLeagueSimsessionIndex(
    league: string
): Promise<SeasonSimsessionIndex[]> {
    const namespace = 'ldata-rsltsts';
    const type = 'leagueSimsessionIndex';

    let ret = await fetchCachedDocument<SeasonSimsessionIndex[]>({ namespace, type, league });

    // TODO: move to backend

    for (let season of ret) {
        season.sessions = season.sessions.filter(session => {
            let hasRace = session.simsessions.reduce((p, c) => p || c.type === 'race', false);
            return hasRace;
        });
    }

    return ret;
}

export async function getLeagueDriverStats(
    league: string
): Promise<{ [name: number]: DriverStatsMap }> {
    const namespace = 'ldata-rsltsts';
    const type = 'leagueDriverStats';
    return await fetchCachedDocument<SeasonSimsessionIndex[]>({ namespace, type, league });
}

export async function getDriverResults(
    league: string,
    custId: string,
    sessionType: 'race' | 'sprint' | 'quali'
): Promise<DriverResults> {
    const namespace = 'ldata-rsltsts';
    const type = 'driverSessionResults';
    return await fetchCachedDocument<SeasonSimsessionIndex[]>({ namespace, type, league, custId, sessionType });
}

export async function getSeasonSimsessionIndex(
    league: string
): Promise<SeasonSimsessionIndex[]> {
    const namespace = 'ldata-rsltsts';
    const type = 'leagueSimsessionIndex';
    return await fetchCachedDocument<SeasonSimsessionIndex[]>({ namespace, type, league });
}

export async function getSimsessionDriverTelemetry(
    subssesion: string,
    simsession: string,
    driver: string
): Promise<ST_DriverTelemetry> {
    return await fetchCachedObject<ST_DriverTelemetry>(
        `/data/ldata-rsltsts/simsessionDriverTelemetry/${subssesion}/${nNums(
            simsession
        )}/${driver}.json`
    );
}

export async function getLeagueSeasonSessions(
    league: string,
    season: string
): Promise<LeagueSeasonSessions> {

    const namespace = 'ldata-irweb';
    const type = 'leagueSeasonSessions';

    let ret = await fetchCachedDocument<SeasonSimsessionIndex[]>({ namespace, type, league, season });

    // TODO: move this to the backend

    let ss = await getLeagueSimsessionIndex(league);
    let season_ = ss.find(v => v.season_id.toString() === season);

    ret.sessions = ret.sessions.filter(v => {
        let simsessions = season_?.sessions.find(ses => ses.subsession_id === v.subsession_id)?.simsessions || [];
        let hasRace = simsessions.reduce((p, c) => {
            return p || c.type === 'race'
        }, false);

        return hasRace;
    });

    return ret;
}

export async function getLeagueSeasons(
    league: string
): Promise<LeagueSeasons> {

    const namespace = 'ldata-irweb';
    const type = 'leagueSeasons';

    return await fetchCachedDocument<SeasonSimsessionIndex[]>({ namespace, type, league });
}

export async function getCuratedBlockedSeasons(): Promise<BlockedSeasons> {

    const namespace = 'ldata-irweb';
    const type = 'blockedSeasons';

    return await fetchCachedDocument<SeasonSimsessionIndex[]>({ namespace, type });
}

export async function getMembersData(
    league: string,
    season: string
): Promise<MembersData> {
    const namespace = 'ldata-irweb';
    const type = 'membersData';

    return await fetchCachedDocument<SeasonSimsessionIndex[]>({ namespace, type, league, season });
}

export async function getCumulativeDeltaBestLapChartData(
    leagueId: string,
    subsessionId: string,
    simsessionNumber: string): Promise<ChartTable> {
    return await fetchCachedObject<ChartTable>(
        `/data/ldata-charts/cumulativeDeltaBestLapChartData/${leagueId}/${subsessionId}/${nNums(
            simsessionNumber
        )}.json`
    );
}

export async function getPacePercentVsIdealLapChartData(
    leagueId: string, subsessionId: string, simsessionNumber: string
): Promise<ChartTable> {
    return await fetchCachedObject<ChartTable>(
        `/data/ldata-charts/pacePercentVsIdealLapChartData/${leagueId}/${subsessionId}/${nNums(
            simsessionNumber
        )}.json`
    );
}

export async function getPacePercentChartData(
    leagueId: string, subsessionId: string, simsessionNumber: string
): Promise<ChartTable> {
    return await fetchCachedObject<ChartTable>(
        `/data/ldata-charts/pacePercentChartData/${leagueId}/${subsessionId}/${nNums(
            simsessionNumber
        )}.json`
    );
}

export async function getStartFinishChartData(
    leagueId: string, subsessionId: string, simsessionNumber: string
): Promise<ChartTable> {
    return await fetchCachedObject<ChartTable>(
        `/data/ldata-charts/startFinishChartData/${leagueId}/${subsessionId}/${nNums(
            simsessionNumber
        )}.json`
    );
}

export async function getCumulativeDeltaChartData(
    leagueId: string, subsessionId: string, simsessionNumber: string
): Promise<ChartTable> {
    return await fetchCachedObject<ChartTable>(
        `/data/ldata-charts/cumulativeDeltaChartData/${leagueId}/${subsessionId}/${nNums(
            simsessionNumber
        )}.json`
    );
}

export async function getLapChartData(
    subsession: string,
    simsession: string
): Promise<LapChartData> {
    return await fetchCachedObject<LapChartData>(
        `/data/ldata-irweb/lapChartData/${subsession}/${nNums(
            simsession
        )}.json`
    );
}

export async function getTelemetrySubsessionIds(
    league: string
): Promise<number[]> {
    return await fetchCachedObject<number[]>(
        `/data/ldata-irrpy/telemetrySubsessions/${league}.json`
    );
}

export async function getCuratedActiveLeagueSchedule(): Promise<ActiveLeagueSchedule> {
    const namespace = 'ldata-usrcfg';
    const type = 'activeLeagueSchedule';
    return await fetchCachedDocument<SeasonSimsessionIndex[]>({ namespace, type });
}

export async function getCuratedLeagueTeamsInfo(
    league: string
): Promise<CuratedLeagueTeamsInfo> {
    const namespace = 'ldata-usrcfg';
    const type = 'leagueTeamsInfo';
    return await fetchCachedDocument<SeasonSimsessionIndex[]>({ namespace, type, league });
}

export async function getCuratedTrackDisplayInfo(): Promise<CuratedTrackDisplayhInfo> {
    const namespace = 'ldata-usrcfg';
    const type = 'trackDisplayInfo';
    return await fetchCachedDocument<SeasonSimsessionIndex[]>({ namespace, type });
}

export async function getGeneratedSimsessionSummary(
    subsessionId: number,
    simsessionNumber: number
): Promise<GeneratedSimsessionSummary> {
    return await fetchCachedObject<GeneratedSimsessionSummary>(
        `/data/ldata-gentxt/simsessionSummary/${subsessionId}/${simsessionNumber}.json`
    );
}
