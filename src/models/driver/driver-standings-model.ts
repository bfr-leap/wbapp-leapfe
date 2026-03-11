import type {
    MembersData,
    M_Member,
    SeasonSimsessionIndex,
    CuratedLeagueTeamsInfo,
    CLTI_Team,
    DriverStatsMap,
} from 'lplib/endpoint-types/iracing-endpoints';

import {
    getMemberViewFromM_Member,
    getFormulaLicense,
} from '@@/src/utils/driver-utils';

import {
    getCuratedLeagueTeamsInfo,
    getLeagueDriverStats,
    getMembersData,
    getSeasonSimsessionIndex,
} from '@@/src/utils/fetch-util';

export interface TeamModel {
    position: number;
    points: number;
    teamName: string;
    teamId: number;
    drivers: {
        name: string;
        custId: string;
    }[];
}
export interface DriverModel {
    position: number;
    points: number;
    clubId: number;
    lastName: string;
    firstName: string;
    iRating: string;
    licenseLevel: string;
    safetyRating: string;
    teamName: string;
    teamId: number;
    showStats: boolean;
    custId: string;
    stats: {
        started: number;
        poles: number;
        wins: number;
        podiums: number;
        top10: number;
        top20: number;
    };
}

export interface DriverStandingsModel {
    drivers: DriverModel[];
    teams: TeamModel[];
}

export function getDefaultStandingsModel(): DriverStandingsModel {
    return { drivers: [], teams: [] };
}

/**
 * Builds maps from custId → teamId and teamId → team info
 * for a given season. Exported for testing.
 */
export function populateTeamInfoMaps(
    leagueTeamsInfo: CuratedLeagueTeamsInfo | null,
    seasonId: number
): {
    userTeamIdMap: Record<number, number>;
    teamInfoMap: Record<number, CLTI_Team>;
} {
    const userTeamIdMap: Record<number, number> = {};
    const teamInfoMap: Record<number, CLTI_Team> = {};

    let season = leagueTeamsInfo?.seasons.find(
        (s) => s.season_id === seasonId
    );
    if (!season) {
        return { userTeamIdMap, teamInfoMap };
    }

    for (let team of season.teams) {
        teamInfoMap[team.team_id] = team;
        for (let member of team.team_members) {
            userTeamIdMap[member] = team.team_id;
        }
    }

    return { userTeamIdMap, teamInfoMap };
}

/**
 * Sorts members by power points (desc), then iRating (desc) as tiebreaker.
 * Exported for testing.
 */
export function sortMembersByStandings(
    members: M_Member[],
    seasonStats: DriverStatsMap | undefined
): M_Member[] {
    if (!seasonStats) {
        return [];
    }

    return [...members].sort((a, b) => {
        const statsA = seasonStats[a.cust_id];
        const statsB = seasonStats[b.cust_id];

        if (!statsA || !statsB) {
            return !statsB ? -1 : 1;
        }

        if (statsB.power_points !== statsA.power_points) {
            return statsB.power_points - statsA.power_points;
        }

        return (
            (getFormulaLicense(b.licenses).irating | 0) -
            (getFormulaLicense(a.licenses).irating | 0)
        );
    });
}

/**
 * Aggregates drivers into teams, sorted by total points (desc).
 * Exported for testing.
 */
export function buildTeamStandings(
    drivers: DriverModel[],
    summaryMode: boolean
): TeamModel[] {
    let teamViewMap: Record<string, TeamModel> = {};

    for (let driver of drivers) {
        let team = teamViewMap[driver.teamName];
        if (!team) {
            teamViewMap[driver.teamName] = team = {
                position: -1,
                points: 0,
                teamName: driver.teamName,
                teamId: driver.teamId,
                drivers: [],
            };
        }

        team.drivers.push({
            name: `${driver.lastName.toUpperCase()}, ${driver.firstName}`,
            custId: driver.custId,
        });

        team.points += driver.points;
    }

    let teamsA = Object.values(teamViewMap).sort(
        (a, b) => b.points - a.points
    );

    teamsA.forEach((v, i) => {
        v.position = i + 1;
    });

    if (summaryMode) {
        teamsA = teamsA.filter((v) => v.position <= 3);
    }

    return teamsA;
}

export async function getDriverStandingsModel(
    league: string,
    season: string,
    summary_mode: boolean
): Promise<DriverStandingsModel> {
    let [
        _driverStatsMap,
        _curatedLeagueTeamsInfo,
        _membersData,
        _seasonSimsessionIndex,
    ] = <
        [
            { [name: number]: DriverStatsMap } | null,
            CuratedLeagueTeamsInfo | null,
            MembersData | null,
            SeasonSimsessionIndex[] | null,
        ]
    >[
        await getLeagueDriverStats(league),
        await getCuratedLeagueTeamsInfo(league),
        await getMembersData(league, season),
        await getSeasonSimsessionIndex(league),
    ];

    let _seasonId = Number.parseInt(season);

    const { userTeamIdMap, teamInfoMap } = populateTeamInfoMaps(
        _curatedLeagueTeamsInfo,
        _seasonId
    );

    let sortedM = sortMembersByStandings(
        _membersData?.members || [],
        _driverStatsMap?.[_seasonId]
    );

    let ret: DriverStandingsModel = getDefaultStandingsModel();
    let allDrivers: DriverModel[] = [];
    let position = 1;

    for (let member of sortedM) {
        const memberView = getMemberViewFromM_Member(
            member,
            userTeamIdMap,
            teamInfoMap
        );

        let dv: DriverModel = {
            position: position,
            points: _driverStatsMap?.[_seasonId]?.[member.cust_id]
                ?.power_points,
            ...memberView,
            showStats: false,
            custId: member.cust_id.toString(),
            clubId: member.club_id,
            stats: {
                started: -1,
                poles: -1,
                wins: -1,
                podiums: -1,
                top10: -1,
                top20: -1,
            },
        };
        ++position;

        allDrivers.push(dv);

        if (!summary_mode || position <= 4) {
            ret.drivers.push(dv);
        }
    }

    ret.teams = buildTeamStandings(allDrivers, summary_mode);

    return ret;
}
