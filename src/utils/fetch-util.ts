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
} from 'lplib/endpoint-types/iracing-endpoints';
import type { UserLeaguesState } from 'lplib/endpoint-types/usrdata';
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
        if (DEBUG_PREFETCH) { console.log('preFetch() skip'); }
        return;
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

let _auth: any = null;

async function fetchObjects(urls: string[]): Promise<any[]> {
    try {
        if (!_auth) {
            _auth = useAuth();
        }

        const token = await _auth.getToken.value();

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

async function fetchCachedDocument<T>(args: { [name: string]: string | number }): Promise<T | null> {
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
    if (leagueSimsessionIndex) {
        return <T>(JSON.parse(JSON.stringify(leagueSimsessionIndex)).doc);
    }
    return null;
}

export async function getSingleMemberData(custId: string): Promise<M_Member | null> {
    const namespace = 'ldata-rsltsts';
    const type = 'singleMemberData';
    return await fetchCachedDocument<M_Member>({ namespace, type, custId });
}

export async function getTrackStats(
    league: string,
    car: string,
    track: string
): Promise<TrackStats | null> {
    const namespace = 'ldata-rsltsts';
    const type = 'trackResults';
    return await fetchCachedDocument<TrackStats>({ namespace, type, league, car, track });
}

export async function getTrackInfoDirectory(
    league: string
): Promise<TrackInfoDirectory | null> {
    const namespace = 'ldata-rsltsts';
    const type = 'trackInfoDirectory';
    return await fetchCachedDocument<TrackInfoDirectory>({ namespace, type, league });
}

export async function getSimsessionResults(
    subsession: string,
    simsession: string
): Promise<SimsessionResults | null> {
    const namespace = 'ldata-rsltsts';
    const type = 'simSessionResults';
    return await fetchCachedDocument<SimsessionResults>({ namespace, type, subsession, simsession });
}

export async function getLeagueSimsessionIndex(
    league: string
): Promise<SeasonSimsessionIndex[] | null> {
    const namespace = 'ldata-rsltsts';
    const type = 'leagueSimsessionIndex';
    let ret = await fetchCachedDocument<SeasonSimsessionIndex[]>({ namespace, type, league });

    // TODO: move to backend
    if (ret) {
        for (let season of ret) {
            season.sessions = season.sessions.filter(session => {
                let hasRace = session.simsessions.reduce((p, c) => p || c.type === 'race', false);
                return hasRace;
            });
        }
    }

    return ret;
}

export async function getLeagueDriverStats(
    league: string
): Promise<{ [name: number]: DriverStatsMap } | null> {
    const namespace = 'ldata-rsltsts';
    const type = 'leagueDriverStats';
    return await fetchCachedDocument<{ [name: number]: DriverStatsMap }>({ namespace, type, league });
}

export async function getDriverResults(
    league: string,
    custId: string,
    sessionType: 'race' | 'sprint' | 'quali'
): Promise<DriverResults | null> {
    const namespace = 'ldata-rsltsts';
    const type = 'driverSessionResults';
    return await fetchCachedDocument<DriverResults>({ namespace, type, league, custId, sessionType });
}

export async function getSeasonSimsessionIndex(
    league: string
): Promise<SeasonSimsessionIndex[] | null> {
    const namespace = 'ldata-rsltsts';
    const type = 'leagueSimsessionIndex';
    return await fetchCachedDocument<SeasonSimsessionIndex[]>({ namespace, type, league });
}

export async function getLeagueSeasonSessions(
    league: string,
    season: string
): Promise<LeagueSeasonSessions | null> {
    const namespace = 'ldata-irweb';
    const type = 'leagueSeasonSessions';
    let ret = await fetchCachedDocument<LeagueSeasonSessions>({ namespace, type, league, season });

    // TODO: move this to the backend
    if (ret) {

        let ss = await getLeagueSimsessionIndex(league);
        let season_ = ss?.find(v => v.season_id.toString() === season);

        ret.sessions = ret.sessions.filter(v => {
            let simsessions = season_?.sessions.find(ses => ses.subsession_id === v.subsession_id)?.simsessions || [];
            let hasRace = simsessions.reduce((p, c) => {
                return p || c.type === 'race'
            }, false);

            return hasRace;
        });
    }

    return ret;
}

export async function getLeagueSeasons(
    league: string
): Promise<LeagueSeasons | null> {
    const namespace = 'ldata-irweb';
    const type = 'leagueSeasons';
    return await fetchCachedDocument<LeagueSeasons>({ namespace, type, league });
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
    return await fetchCachedDocument<MembersData>({ namespace, type, league, season });
}

export async function getCumulativeDeltaBestLapChartData(
    league: string,
    subsession: string,
    simsession: string): Promise<ChartTable | null> {
    const namespace = 'ldata-charts';
    const type = 'cumulativeDeltaBestLapChartData';
    return await fetchCachedDocument<ChartTable>({ namespace, type, league, subsession, simsession });
}

export async function getPacePercentVsIdealLapChartData(
    league: string, subsession: string, simsession: string
): Promise<ChartTable | null> {
    const namespace = 'ldata-charts';
    const type = 'pacePercentVsIdealLapChartData';
    return await fetchCachedDocument<ChartTable>({ namespace, type, league, subsession, simsession });
}

export async function getPacePercentChartData(
    league: string, subsession: string, simsession: string
): Promise<ChartTable | null> {
    const namespace = 'ldata-charts';
    const type = 'pacePercentChartData';
    return await fetchCachedDocument<ChartTable>({ namespace, type, league, subsession, simsession });
}

export async function getStartFinishChartData(
    league: string, subsession: string, simsession: string
): Promise<ChartTable | null> {
    const namespace = 'ldata-charts';
    const type = 'startFinishChartData';
    return await fetchCachedDocument<ChartTable>({ namespace, type, league, subsession, simsession });
}

export async function getCumulativeDeltaChartData(
    league: string, subsession: string, simsession: string
): Promise<ChartTable | null> {
    const namespace = 'ldata-charts';
    const type = 'cumulativeDeltaChartData';
    return await fetchCachedDocument<ChartTable>({ namespace, type, league, subsession, simsession });
}

export async function getLapChartData(
    subsession: string,
    simsession: string
): Promise<LapChartData | null> {
    const namespace = 'ldata-irweb';
    const type = 'lapChartData';
    return await fetchCachedDocument<LapChartData>({ namespace, type, subsession, simsession });
}

export async function getTelemetrySubsessionIds(
    league: string
): Promise<number[] | null> {
    const namespace = 'ldata-irrpy';
    const type = 'telemetrySubsessions';
    return await fetchCachedDocument<number[]>({ namespace, type, league });
}

export async function getCuratedActiveLeagueSchedule(): Promise<ActiveLeagueSchedule | null> {
    const namespace = 'ldata-usrcfg';
    const type = 'activeLeagueSchedule';
    return await fetchCachedDocument<ActiveLeagueSchedule>({ namespace, type });
}

export async function getCuratedLeagueTeamsInfo(
    league: string
): Promise<CuratedLeagueTeamsInfo | null> {
    const namespace = 'ldata-usrcfg';
    const type = 'leagueTeamsInfo';
    return await fetchCachedDocument<CuratedLeagueTeamsInfo>({ namespace, type, league });
}

export async function getCuratedTrackDisplayInfo(): Promise<CuratedTrackDisplayhInfo | null> {
    const namespace = 'ldata-usrcfg';
    const type = 'trackDisplayInfo';
    return await fetchCachedDocument<CuratedTrackDisplayhInfo>({ namespace, type });
}

export async function getGeneratedSimsessionSummary(
    subsession: number,
    simsession: number
): Promise<GeneratedSimsessionSummary | null> {
    const namespace = 'ldata-gentxt';
    const type = 'simsessionSummary';
    let ret = await fetchCachedDocument<GeneratedSimsessionSummary>({ namespace, type, subsession, simsession });
    return ret;
}

export interface IrLinkState {
    isVerified: boolean,
    irCustId: string,
    msgSent: boolean,
}

export async function getIrLinkState(): Promise<IrLinkState> {
    const namespace = 'ldata-usrdata';
    const type = 'irLinkState';

    let source: string = prepUrl({ namespace, type });
    let ret = await fetchObjects([source]);

    return ret[0].doc;
}

export async function setIrLinkDriver(driver: string): Promise<{}> {
    const namespace = 'ldata-usrdata';
    const type = 'irLinkDriverUpd';

    let source: string = prepUrl({ namespace, type, driver });
    let ret = await fetchObjects([source]);

    return ret[0].doc;
}

export async function setIrLinkCode(code: number): Promise<{}> {
    const namespace = 'ldata-usrdata';
    const type = 'irLinkCodeUpd';

    let source: string = prepUrl({ namespace, type, code });
    let ret = await fetchObjects([source]);

    return ret[0].doc;
}

let _userLeagueStateCache: Promise<any> | null = null;
let _userLeagueStateTimer: any = 0;
let _userLeagueStateTimeout = 1500;
export async function getUserLeaguesState(): Promise<UserLeaguesState> {
    const namespace = 'ldata-usrdata';
    const type = 'userLeagues';

    if (_userLeagueStateTimer) {
        clearTimeout(_userLeagueStateTimer);
        _userLeagueStateTimer = 0;
    }

    _userLeagueStateTimer = setTimeout(() => {
        _userLeagueStateCache = null;
    }, _userLeagueStateTimeout);

    if (!_userLeagueStateCache) {
        let source: string = prepUrl({ namespace, type });
        _userLeagueStateCache = fetchObjects([source]);
    }

    return (await _userLeagueStateCache)[0].doc;
}


export async function setUserLeaguesState(leagueIDList: number[]): Promise<UserLeaguesState> {
    const namespace = 'ldata-usrdata';
    const type = 'userLeaguesUpd';

    let code = leagueIDList.join('-');

    let source: string = prepUrl({ namespace, type, code });
    let ret = await fetchObjects([source]);

    return ret[0].doc;
}
