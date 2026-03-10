import type {
    MembersData,
    M_License,
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
    return JSON.parse(
        JSON.stringify({
            drivers: [],
            teams: [],
        })
    );
}

function populateTeamInfoMaps(
    leagueTeamsInfo: CuratedLeagueTeamsInfo,
    seasonId: number,
    userTeamIdMap: { [name: number]: number },
    teamInfoMap: { [name: number]: CLTI_Team }
) {
    let season = leagueTeamsInfo?.seasons.find((s) => s.season_id === seasonId);
    if (!season) {
        return {};
    }

    for (let team of season.teams) {
        teamInfoMap[team.team_id] = team;
        for (let member of team.team_members) {
            userTeamIdMap[member] = team.team_id;
        }
    }
}

export async function getDriverStandingsModel(
    league: string,
    season: string,
    summary_mode: boolean
) {
    let [
        _driverStatsMap,
        _curatedLeagueTeamsInfo,
        _membersData,
        _seasonSimsessionIndex,
    ] = <
        [
            { [name: number]: DriverStatsMap },
            CuratedLeagueTeamsInfo,
            MembersData,
            SeasonSimsessionIndex[]
        ]
    >[
        await getLeagueDriverStats(league),
        await getCuratedLeagueTeamsInfo(league),
        await getMembersData(league, season),
        await getSeasonSimsessionIndex(league),
    ];

    let _seasonId = Number.parseInt(season);

    let _userTeamIdMap: { [name: number]: number } = {};
    let _teamInfoMap: { [name: number]: CLTI_Team } = {};
    populateTeamInfoMaps(
        _curatedLeagueTeamsInfo,
        _seasonId,
        _userTeamIdMap,
        _teamInfoMap
    );

    let sortedM = _driverStatsMap
        ? _membersData?.members.sort((a, b) =>
              !_driverStatsMap[_seasonId][b.cust_id] ||
              !_driverStatsMap[_seasonId][a.cust_id]
                  ? !_driverStatsMap[_seasonId][b.cust_id]
                      ? -1
                      : 1
                  : _driverStatsMap[_seasonId][b.cust_id].power_points !==
                    _driverStatsMap[_seasonId][a.cust_id].power_points
                  ? _driverStatsMap[_seasonId][b.cust_id].power_points -
                    _driverStatsMap[_seasonId][a.cust_id].power_points
                  : (getFormulaLicense(b.licenses).irating | 0) -
                    (getFormulaLicense(a.licenses).irating | 0)
          ) || []
        : [];

    let ret: DriverStandingsModel = getDefaultStandingsModel();

    ret.drivers = [];
    let allDrivers: DriverModel[] = [];

    let position = 1;

    for (let member of sortedM) {
        const memberView = getMemberViewFromM_Member(
            member,
            _userTeamIdMap,
            _teamInfoMap
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

    let teamViewMap: { [name: string]: TeamModel } = {};
    for (let driver of allDrivers) {
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
            name: `${driver.lastName.toUpperCase}, ${driver.firstName}`,
            custId: driver.custId,
        });

        team.points += driver.points;
    }
    let teamsA = Object.keys(teamViewMap)
        .map((k) => teamViewMap[k])
        .sort((a, b) => b.points - a.points);

    teamsA.forEach((v, i) => {
        v.position = i + 1;
    });

    if (summary_mode) {
        teamsA = teamsA.filter((v) => v.position <= 3);
    }

    ret.teams = teamsA;

    return ret;
}
