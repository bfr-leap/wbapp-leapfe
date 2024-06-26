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
import { useAuth } from 'vue-clerk';

const DEBUG_PREFETCH = false;

function nNums(n: string): string {
    return n.toString().replace('-', 'n');
}

let _prefetchPromise: Promise<any> | null = null;

async function toPromise(v: any): Promise<any> {
    return v;
}

export async function preFetch(args: any) {
    if (DEBUG_PREFETCH) { console.log('preFetch() start'); }

    if (_prefetchPromise) {
        await _prefetchPromise;
    }

    let keys = Object.keys(args);
    let argv = keys.map((v) => `${v}=${args[v]}`);

    let url = `/api/prefetch-load/?${argv.join('&')}`;

    let p = fetchObjects([url]);

    _prefetchPromise = p;

    let x = (await p)[0];

    _prefetchPromise = null;

    keys = Object.keys(x.docs);
    for (let key of keys) {
        if (x.docs[key]) {
            _cacheStorage[key] = toPromise([{ doc: x.docs[key] }]);
        }
    }
    if (DEBUG_PREFETCH) { console.log('preFetch() done'); }
}



async function fetchObjects(urls: string[]): Promise<any[]> {
    try {
        const auth = useAuth();
        const token = await auth.getToken.value();

        console.log(token);

        let objs = await Promise.all(
            (
                await Promise.all(urls.map((url) => fetch(url
                    , {
                        headers: { Authorization: `Bearer ${token}` }
                    }
                )))
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

function prepUrl(args: { [name: string]: string | number }): string {
    let ret = [];
    let keys = Object.keys(args);
    for (let key of keys) {
        ret.push(`${key}=${args[key]}`);
    }

    return `/api/fetch-document?${ret.join('&')}`;
}

async function fetchCachedDocument<T>(args: { [name: string]: string | number }): Promise<T> {
    if (_prefetchPromise) {
        await _prefetchPromise;
    }

    let source: string = prepUrl(args);
    let p = _cacheStorage[source];

    if (!p) {
        if (DEBUG_PREFETCH) { console.log('looking for: ', source); }

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
    league: string,
    car: string,
    track: string
): Promise<TrackStats> {
    const namespace = 'ldata-rsltsts';
    const type = 'trackResults';
    return await fetchCachedDocument<SeasonSimsessionIndex[]>({ namespace, type, league, car, track });
}

export async function getTrackInfoDirectory(
    league: string
): Promise<TrackInfoDirectory> {
    const namespace = 'ldata-rsltsts';
    const type = 'trackInfoDirectory';
    return await fetchCachedDocument<SeasonSimsessionIndex[]>({ namespace, type, league });
}

export async function getSimsessionResults(
    subsession: string,
    simsession: string
): Promise<SimsessionResults> {
    const namespace = 'ldata-rsltsts';
    const type = 'simSessionResults';
    return await fetchCachedDocument<SeasonSimsessionIndex[]>({ namespace, type, subsession, simsession });
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
    league: string,
    subsession: string,
    simsession: string): Promise<ChartTable> {
    const namespace = 'ldata-charts';
    const type = 'cumulativeDeltaBestLapChartData';
    return await fetchCachedDocument<SeasonSimsessionIndex[]>({ namespace, type, league, subsession, simsession });
}

export async function getPacePercentVsIdealLapChartData(
    league: string, subsession: string, simsession: string
): Promise<ChartTable> {
    const namespace = 'ldata-charts';
    const type = 'pacePercentVsIdealLapChartData';
    return await fetchCachedDocument<SeasonSimsessionIndex[]>({ namespace, type, league, subsession, simsession });
}

export async function getPacePercentChartData(
    league: string, subsession: string, simsession: string
): Promise<ChartTable> {
    const namespace = 'ldata-charts';
    const type = 'pacePercentChartData';
    return await fetchCachedDocument<SeasonSimsessionIndex[]>({ namespace, type, league, subsession, simsession });
}

export async function getStartFinishChartData(
    league: string, subsession: string, simsession: string
): Promise<ChartTable> {
    const namespace = 'ldata-charts';
    const type = 'startFinishChartData';
    return await fetchCachedDocument<SeasonSimsessionIndex[]>({ namespace, type, league, subsession, simsession });
}

export async function getCumulativeDeltaChartData(
    league: string, subsession: string, simsession: string
): Promise<ChartTable> {
    const namespace = 'ldata-charts';
    const type = 'cumulativeDeltaChartData';
    return await fetchCachedDocument<SeasonSimsessionIndex[]>({ namespace, type, league, subsession, simsession });
}

export async function getLapChartData(
    subsession: string,
    simsession: string
): Promise<LapChartData> {
    const namespace = 'ldata-irweb';
    const type = 'lapChartData';
    return await fetchCachedDocument<SeasonSimsessionIndex[]>({ namespace, type, subsession, simsession });
}

export async function getTelemetrySubsessionIds(
    league: string
): Promise<number[]> {
    const namespace = 'ldata-irrpy';
    const type = 'telemetrySubsessions';
    return await fetchCachedDocument<SeasonSimsessionIndex[]>({ namespace, type, league });
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
    subsession: number,
    simsession: number
): Promise<GeneratedSimsessionSummary> {
    const namespace = 'ldata-gentxt';
    const type = 'simsessionSummary';
    return await fetchCachedDocument<SeasonSimsessionIndex[]>({ namespace, type, subsession, simsession });
}
