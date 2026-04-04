import type {
    CuratedLeagueTeamsInfo,
    DriverStatsMap,
    DriverStats,
    M_Member,
    LeagueSeasons,
    DriverResults,
    SSR_ResultsEntry,
    DotdProfile,
} from '@@/lplib/endpoint-types/iracing-endpoints';

import {
    getCuratedLeagueTeamsInfo,
    getDriverResults,
    getLeagueDriverStats,
    getLeagueSeasons,
    getSingleMemberData,
    getDotdProfile,
} from '@@/src/utils/fetch-util';

import { getMemberViewFromM_Member } from '@@/src/utils/driver-utils';

interface DriverResultsModel {
    race: DriverResults;
    sprint: DriverResults;
    quali: DriverResults;
}

function getDefaultDriverResultsModel(): DriverResultsModel {
    return { race: {}, sprint: {}, quali: {} };
}

interface MemberView {
    clubId: number;
    lastName: string;
    firstName: string;
    iRating: string;
    licenseLevel: string;
    safetyRating: string;
    teamName: string;
    teamId: number;
}

export interface DriverProfileModel {
    singleMemberData: M_Member | null;
    leagueSeasons: LeagueSeasons | null;
    teamsInfo: CuratedLeagueTeamsInfo | null;
    driverStatsMap: { [name: number]: DriverStatsMap } | null;
    driverResults: DriverResultsModel;
    allTimeResults: DriverResultsModel;
    memberView: MemberView;
    dotdProfile: DotdProfile | null;
}

export function getDefaultDriverProfileModel(): DriverProfileModel {
    return {
        singleMemberData: null,
        leagueSeasons: null,
        teamsInfo: null,
        driverStatsMap: null,
        driverResults: getDefaultDriverResultsModel(),
        allTimeResults: getDefaultDriverResultsModel(),
        memberView: {
            clubId: 0,
            lastName: '---',
            firstName: '---',
            iRating: '---',
            licenseLevel: '',
            safetyRating: '---',
            teamName: '---',
            teamId: 0,
        },
        dotdProfile: null,
    };
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
    const dotdProfile = await getDotdProfile(league, driver);

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

    if (
        !driverSessionResultsRace ||
        !driverSessionResultsSprint ||
        !driverSessionResultsQuali
    ) {
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
    ret.dotdProfile = dotdProfile;

    ret.allTimeResults = {
        race: calculateAllTimeResults(driverSessionResultsRace),
        sprint: calculateAllTimeResults(driverSessionResultsSprint),
        quali: calculateAllTimeResults(driverSessionResultsQuali),
    };

    ret.memberView = getMemberViewFromM_Member(ret.singleMemberData, {}, {});

    return ret;
}
