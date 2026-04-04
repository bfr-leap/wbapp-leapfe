import { describe, it, expect } from 'vitest';
import {
    populateTeamInfoMaps,
    sortMembersByStandings,
    buildTeamStandings,
    getDefaultStandingsModel,
} from './driver-standings-model';
import type {
    CuratedLeagueTeamsInfo,
    M_Member,
    DriverStatsMap,
} from 'lplib/endpoint-types/iracing-endpoints';
import type { DriverModel } from './driver-standings-model';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeMember(
    custId: number,
    name: string,
    irating: number = 2000
): M_Member {
    return {
        cust_id: custId,
        display_name: name,
        club_id: 1,
        club_name: 1,
        ai: false,
        helmet: {} as M_Member['helmet'],
        last_login: '',
        member_since: '',
        licenses: [
            {
                category_id: 1,
                category: 'formula_car',
                license_level: 20,
                safety_rating: 3.5,
                cpi: 0,
                irating,
                tt_rating: 0,
                mpr_num_races: 0,
                color: '#00FF00',
                group_name: 'Class A',
            },
        ],
    } as M_Member;
}

function makeDriver(overrides: Partial<DriverModel> = {}): DriverModel {
    return {
        position: 1,
        points: 100,
        clubId: 1,
        lastName: 'Smith',
        firstName: 'John',
        iRating: '2.0k',
        licenseLevel: 'A',
        safetyRating: '3.5',
        teamName: 'Team A',
        teamId: 1,
        showStats: false,
        custId: '1',
        stats: {
            started: -1,
            poles: -1,
            wins: -1,
            podiums: -1,
            top10: -1,
            top20: -1,
        },
        ...overrides,
    };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getDefaultStandingsModel', () => {
    it('returns empty drivers and teams arrays', () => {
        const model = getDefaultStandingsModel();
        expect(model.drivers).toEqual([]);
        expect(model.teams).toEqual([]);
    });
});

describe('populateTeamInfoMaps', () => {
    const teamsInfo: CuratedLeagueTeamsInfo = {
        league_id: 100,
        seasons: [
            {
                season_id: 1,
                teams: [
                    {
                        team_id: 10,
                        team_name: 'Ferrari',
                        team_members: [101, 102],
                        team_logo: '',
                    },
                    {
                        team_id: 20,
                        team_name: 'Mercedes',
                        team_members: [201],
                        team_logo: '',
                    },
                ],
            },
        ],
    };

    it('maps members to their team IDs', () => {
        const { userTeamIdMap } = populateTeamInfoMaps(teamsInfo, 1);
        expect(userTeamIdMap[101]).toBe(10);
        expect(userTeamIdMap[102]).toBe(10);
        expect(userTeamIdMap[201]).toBe(20);
    });

    it('maps team IDs to team info', () => {
        const { teamInfoMap } = populateTeamInfoMaps(teamsInfo, 1);
        expect(teamInfoMap[10].team_name).toBe('Ferrari');
        expect(teamInfoMap[20].team_name).toBe('Mercedes');
    });

    it('returns empty maps for unknown season', () => {
        const { userTeamIdMap, teamInfoMap } = populateTeamInfoMaps(
            teamsInfo,
            999
        );
        expect(Object.keys(userTeamIdMap)).toHaveLength(0);
        expect(Object.keys(teamInfoMap)).toHaveLength(0);
    });

    it('handles null input gracefully', () => {
        const { userTeamIdMap, teamInfoMap } = populateTeamInfoMaps(null, 1);
        expect(Object.keys(userTeamIdMap)).toHaveLength(0);
        expect(Object.keys(teamInfoMap)).toHaveLength(0);
    });
});

describe('sortMembersByStandings', () => {
    it('sorts by power_points descending', () => {
        const members = [
            makeMember(1, 'Low Points'),
            makeMember(2, 'High Points'),
            makeMember(3, 'Mid Points'),
        ];

        const stats: DriverStatsMap = {
            1: {
                cust_id: 1,
                power_points: 50,
            } as DriverStatsMap[number],
            2: {
                cust_id: 2,
                power_points: 200,
            } as DriverStatsMap[number],
            3: {
                cust_id: 3,
                power_points: 100,
            } as DriverStatsMap[number],
        };

        const sorted = sortMembersByStandings(members, stats);
        expect(sorted[0].cust_id).toBe(2); // 200 pts
        expect(sorted[1].cust_id).toBe(3); // 100 pts
        expect(sorted[2].cust_id).toBe(1); // 50 pts
    });

    it('uses iRating as tiebreaker when points are equal', () => {
        const members = [
            makeMember(1, 'Low iRating', 1500),
            makeMember(2, 'High iRating', 4000),
        ];

        const stats: DriverStatsMap = {
            1: {
                cust_id: 1,
                power_points: 100,
            } as DriverStatsMap[number],
            2: {
                cust_id: 2,
                power_points: 100,
            } as DriverStatsMap[number],
        };

        const sorted = sortMembersByStandings(members, stats);
        expect(sorted[0].cust_id).toBe(2); // higher irating
        expect(sorted[1].cust_id).toBe(1);
    });

    it('returns empty array when stats are undefined', () => {
        const members = [makeMember(1, 'Test')];
        const sorted = sortMembersByStandings(members, undefined);
        expect(sorted).toEqual([]);
    });

    it('handles members without stats (pushes them to end)', () => {
        const members = [makeMember(1, 'No Stats'), makeMember(2, 'Has Stats')];

        const stats: DriverStatsMap = {
            2: {
                cust_id: 2,
                power_points: 100,
            } as DriverStatsMap[number],
        };

        const sorted = sortMembersByStandings(members, stats);
        expect(sorted[0].cust_id).toBe(2);
        expect(sorted[1].cust_id).toBe(1);
    });

    it('does not mutate the original array', () => {
        const members = [makeMember(2, 'B'), makeMember(1, 'A')];

        const stats: DriverStatsMap = {
            1: {
                cust_id: 1,
                power_points: 200,
            } as DriverStatsMap[number],
            2: {
                cust_id: 2,
                power_points: 100,
            } as DriverStatsMap[number],
        };

        const sorted = sortMembersByStandings(members, stats);
        expect(members[0].cust_id).toBe(2); // original unchanged
        expect(sorted[0].cust_id).toBe(1); // sorted copy
    });
});

describe('buildTeamStandings', () => {
    it('aggregates drivers into teams sorted by points', () => {
        const drivers = [
            makeDriver({
                teamName: 'Team B',
                teamId: 2,
                points: 50,
                lastName: 'Driver',
                firstName: 'One',
                custId: '1',
            }),
            makeDriver({
                teamName: 'Team A',
                teamId: 1,
                points: 300,
                lastName: 'Driver',
                firstName: 'Two',
                custId: '2',
            }),
            makeDriver({
                teamName: 'Team B',
                teamId: 2,
                points: 150,
                lastName: 'Driver',
                firstName: 'Three',
                custId: '3',
            }),
        ];

        const teams = buildTeamStandings(drivers, false);
        expect(teams[0].teamName).toBe('Team A');
        expect(teams[0].points).toBe(300);
        expect(teams[0].position).toBe(1);

        expect(teams[1].teamName).toBe('Team B');
        expect(teams[1].points).toBe(200); // 50 + 150
        expect(teams[1].position).toBe(2);
    });

    it('assigns correct positions', () => {
        const drivers = [
            makeDriver({
                teamName: 'Alpha',
                teamId: 1,
                points: 300,
                custId: '1',
            }),
            makeDriver({
                teamName: 'Beta',
                teamId: 2,
                points: 200,
                custId: '2',
            }),
            makeDriver({
                teamName: 'Gamma',
                teamId: 3,
                points: 100,
                custId: '3',
            }),
        ];

        const teams = buildTeamStandings(drivers, false);
        expect(teams[0].position).toBe(1);
        expect(teams[1].position).toBe(2);
        expect(teams[2].position).toBe(3);
    });

    it('limits to top 3 in summary mode', () => {
        const drivers = [
            makeDriver({
                teamName: 'T1',
                teamId: 1,
                points: 400,
                custId: '1',
            }),
            makeDriver({
                teamName: 'T2',
                teamId: 2,
                points: 300,
                custId: '2',
            }),
            makeDriver({
                teamName: 'T3',
                teamId: 3,
                points: 200,
                custId: '3',
            }),
            makeDriver({
                teamName: 'T4',
                teamId: 4,
                points: 100,
                custId: '4',
            }),
        ];

        const teams = buildTeamStandings(drivers, true);
        expect(teams).toHaveLength(3);
        expect(teams.map((t) => t.teamName)).toEqual(['T1', 'T2', 'T3']);
    });

    it('groups multiple drivers into the same team', () => {
        const drivers = [
            makeDriver({
                teamName: 'Ferrari',
                teamId: 1,
                points: 100,
                lastName: 'Leclerc',
                firstName: 'Charles',
                custId: '1',
            }),
            makeDriver({
                teamName: 'Ferrari',
                teamId: 1,
                points: 80,
                lastName: 'Sainz',
                firstName: 'Carlos',
                custId: '2',
            }),
        ];

        const teams = buildTeamStandings(drivers, false);
        expect(teams).toHaveLength(1);
        expect(teams[0].points).toBe(180);
        expect(teams[0].drivers).toHaveLength(2);
    });

    it('formats driver names as LASTNAME, FirstName', () => {
        const drivers = [
            makeDriver({
                teamName: 'Team',
                teamId: 1,
                points: 100,
                lastName: 'Verstappen',
                firstName: 'Max',
                custId: '1',
            }),
        ];

        const teams = buildTeamStandings(drivers, false);
        expect(teams[0].drivers[0].name).toBe('VERSTAPPEN, Max');
    });
});
