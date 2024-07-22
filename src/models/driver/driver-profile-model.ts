import type {
    CuratedLeagueTeamsInfo,
    DriverStatsMap,
    DriverStats,
    M_Member,
    LeagueSeasons,
    DriverResults,
    SSR_ResultsEntry,
} from 'lplib/endpoint-types/iracing-endpoints';

import {
    getCuratedLeagueTeamsInfo,
    getDriverResults,
    getLeagueDriverStats,
    getLeagueSeasons,
    getSingleMemberData,
} from '@/utils/fetch-util';

interface DriverResultsModel {
    race: DriverResults;
    sprint: DriverResults;
    quali: DriverResults;
}

function getDefaultDriverResultsModel(): DriverResultsModel {
    return JSON.parse(JSON.stringify({ race: {}, sprint: {}, quali: {} }));
}

export interface DriverProfileModel {
    singleMemberData: M_Member | null;
    leagueSeasons: LeagueSeasons | null;
    teamsInfo: CuratedLeagueTeamsInfo | null;
    driverStatsMap: { [name: number]: DriverStatsMap } | null;
    driverResults: DriverResultsModel;
    allTimeResults: DriverResultsModel;
}

export function getDefaultDriverProfileModel(): DriverProfileModel {
    return JSON.parse(
        JSON.stringify({
            singleMemberData: null,
            leagueSeasons: null,
            teamsInfo: null,
            driverStatsMap: null,
            driverResults: getDefaultDriverResultsModel(),
            allTimeResults: getDefaultDriverResultsModel(),
        })
    );
}

function calculateAllTimeResults(
    inDriverResults: DriverResults
): DriverResults {
    let ret: DriverResults = {};
    if (!inDriverResults) {
        return ret;
    }
    let allTime: { [name: number]: SSR_ResultsEntry } = {};

    let inSeasonKeys = Object.keys(inDriverResults);

    for (let seasonKey of inSeasonKeys) {
        let season = inDriverResults[Number.parseInt(seasonKey)];
        let eventKeys = Object.keys(season);
        for (let eventKey of eventKeys) {
            let eventKeyNum = Number.parseInt(eventKey);
            allTime[eventKeyNum] = season[eventKeyNum];
        }
    }

    ret[0] = allTime;

    return ret;
}

export async function getDriverProfileModel(league: string, driver: string) {
    let ret = getDefaultDriverProfileModel();
    const driverStatsMap = await getLeagueDriverStats(league);
    const leagueTeamsInfo = await getCuratedLeagueTeamsInfo(league);
    const singleMemberData = await getSingleMemberData(driver);

    const leagueSeasons = await getLeagueSeasons(league);

    const driverSessionResultsRace = await getDriverResults(
        league,
        driver,
        'race'
    );

    const driverSessionResultsSprint = await getDriverResults(
        league,
        driver,
        'sprint'
    );

    const driverSessionResultsQuali = await getDriverResults(
        league,
        driver,
        'quali'
    );

    leagueSeasons?.seasons.sort((a, b) => b.season_id - a.season_id) || [];

    if (!driverSessionResultsRace || !driverSessionResultsSprint || !driverSessionResultsQuali) {
        return ret;
    }

    ret.driverResults = {
        race: driverSessionResultsRace,
        sprint: driverSessionResultsSprint,
        quali: driverSessionResultsQuali,
    };

    ret.driverStatsMap = driverStatsMap;
    ret.teamsInfo = leagueTeamsInfo;
    ret.singleMemberData = singleMemberData;
    ret.leagueSeasons = leagueSeasons;

    ret.allTimeResults = {
        race: calculateAllTimeResults(driverSessionResultsRace),
        sprint: calculateAllTimeResults(driverSessionResultsSprint),
        quali: calculateAllTimeResults(driverSessionResultsQuali),
    };

    return ret;
}
