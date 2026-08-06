import { describe, it, expect, vi } from 'vitest';

// buildSrhStandingsModel fills the form strip from srhweb's own races, which
// means three fetches. Stub them: the strip's own logic is covered in
// srh-standings-model.test.ts, and what matters here is the ranking.
vi.mock('@@/src/services/srhweb-service', () => ({
    getSrhSeasonInfo: vi.fn(),
    getSrhSeasonStandings: vi.fn(),
    getSrhRaceResults: vi.fn().mockResolvedValue(null),
}));
import {
    populateTeamInfoMaps,
    sortMembersByStandings,
    buildTeamStandings,
    getDefaultStandingsModel,
    computeRecentFinishes,
    computePositionChanges,
    buildSrhStandingsModel,
} from './driver-standings-model';
import type {
    CuratedLeagueTeamsInfo,
    M_Member,
    DriverStatsMap,
    SimsessionResults,
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

// ---------------------------------------------------------------------------
// Recent-form / movement helpers
// ---------------------------------------------------------------------------

function makeRace(
    subsession: number,
    entries: { cust_id: number; position: number; points?: number }[]
): SimsessionResults {
    return {
        subsession_id: subsession,
        simsession_number: 0,
        results: entries.map((e) => ({
            cust_id: e.cust_id,
            position: e.position,
            start_position: e.position,
            interval: 0,
            avg_lap_time: 0,
            fastest_lap_time: 0,
            fast_lap: 0,
            laps_completed: 0,
            points: e.points ?? 0,
            incidents: 0,
            pace_percent: 0,
        })),
    } as SimsessionResults;
}

describe('computeRecentFinishes', () => {
    it('returns one entry per race in chronological order', () => {
        const races = [
            makeRace(101, [
                { cust_id: 1, position: 4 },
                { cust_id: 2, position: 1 },
            ]),
            makeRace(102, [
                { cust_id: 1, position: 2 },
                { cust_id: 2, position: 5 },
            ]),
            makeRace(103, [
                { cust_id: 1, position: 1 },
                { cust_id: 2, position: 3 },
            ]),
        ];

        expect(computeRecentFinishes('1', races)).toEqual([4, 2, 1]);
        expect(computeRecentFinishes('2', races)).toEqual([1, 5, 3]);
    });

    it('marks a DNS as null without dropping the slot', () => {
        // Driver 1 skipped the middle race — the strip must still
        // show three positions so it lines up visually with peers.
        const races = [
            makeRace(101, [{ cust_id: 1, position: 3 }]),
            makeRace(102, [{ cust_id: 2, position: 1 }]),
            makeRace(103, [{ cust_id: 1, position: 2 }]),
        ];

        expect(computeRecentFinishes('1', races)).toEqual([3, null, 2]);
    });

    it('handles null entries (failed broker fetches) gracefully', () => {
        const races = [
            null,
            makeRace(102, [{ cust_id: 1, position: 1 }]),
            null,
        ];
        expect(computeRecentFinishes('1', races)).toEqual([null, 1, null]);
    });

    it('returns an empty list when no races are supplied', () => {
        expect(computeRecentFinishes('1', [])).toEqual([]);
    });
});

describe('computePositionChanges', () => {
    it('marks the driver who jumped from P3 to P1 as +2', () => {
        // Current standings after the race
        const drivers = [
            { custId: '10', position: 1, points: 120 },
            { custId: '20', position: 2, points: 110 },
            { custId: '30', position: 3, points: 100 },
        ];
        // The race driver 10 just won; subtract their 25 pts to get
        // pre-race totals (95, 110, 100) → previous order was 20,30,10.
        const lastRace = makeRace(99, [
            { cust_id: 10, position: 1, points: 25 },
            { cust_id: 20, position: 2, points: 0 },
            { cust_id: 30, position: 3, points: 0 },
        ]);

        const changes = computePositionChanges(drivers, lastRace);
        expect(changes.get('10')).toBe(2); // P3 → P1
        expect(changes.get('20')).toBe(-1); // P1 → P2
        expect(changes.get('30')).toBe(-1); // P2 → P3
    });

    it('returns 0 for unchanged positions', () => {
        const drivers = [
            { custId: '1', position: 1, points: 200 },
            { custId: '2', position: 2, points: 100 },
        ];
        const lastRace = makeRace(99, [
            { cust_id: 1, position: 1, points: 25 },
            { cust_id: 2, position: 2, points: 20 },
        ]);

        const changes = computePositionChanges(drivers, lastRace);
        expect(changes.get('1')).toBe(0);
        expect(changes.get('2')).toBe(0);
    });

    it('returns an empty map when there is no prior race', () => {
        const drivers = [{ custId: '1', position: 1, points: 100 }];
        expect(computePositionChanges(drivers, null).size).toBe(0);
    });

    it('treats DNS drivers as keeping their full point total', () => {
        // Driver 2 sat out the last race, so their total is the same
        // as their pre-race total. Driver 1 just earned 30 pts;
        // pre-race totals: (1: 70, 2: 80) → previous order 2,1.
        const drivers = [
            { custId: '1', position: 1, points: 100 },
            { custId: '2', position: 2, points: 80 },
        ];
        const lastRace = makeRace(99, [
            { cust_id: 1, position: 1, points: 30 },
        ]);

        const changes = computePositionChanges(drivers, lastRace);
        expect(changes.get('1')).toBe(1); // P2 → P1
        expect(changes.get('2')).toBe(-1); // P1 → P2
    });
});

// ---------------------------------------------------------------------------
// srhweb-backed standings
//
// The contract that matters here is additive: when a league is NOT on
// simracerhub the model is byte-identical to what it always was, and when it
// IS, the published position/points replace the computed ones without any
// existing field changing meaning.
// ---------------------------------------------------------------------------

describe('buildSrhStandingsModel', () => {
    const INFO: any = {
        season_id: 134456,
        season_name: 'Season 19',
        league_id: 4534,
        league_name: 'League Zero',
        series_name: 'Formula Series',
        drop_weeks: 1,
        keep_weeks: 4,
        classes: [{ class_id: 0, class_name: 'Overall' }],
        schedule: [
            {
                subsession_id: 86551649,
                sessions: [
                    {
                        simsession_number: -3,
                        session_type: 'OPEN QUALIFYING',
                        is_race: false,
                    },
                    {
                        simsession_number: -2,
                        session_type: 'RACE',
                        is_race: true,
                    },
                    {
                        simsession_number: 0,
                        session_type: 'RACE',
                        is_race: true,
                    },
                ],
                race_date: 1781755200,
                track: {
                    track_id: 1,
                    config_id: 2,
                    track_name: 'Spa',
                    config_name: 'GP',
                    length_km: 4.3,
                    turns: 19,
                },
                event_name: null,
                is_chase: false,
                can_drop: true,
                counts_for_points: true,
            },
        ],
        drivers: {
            '174470': {
                cust_id: 174470,
                display_name: 'Alpha One',
                sort_name: 'One, Alpha',
                country_code: 'US',
            },
            '201632': {
                cust_id: 201632,
                display_name: 'Beta Two',
                sort_name: 'Two, Beta',
                country_code: 'GB',
            },
            '999999': {
                cust_id: 999999,
                display_name: 'New Guy',
                sort_name: 'Guy, New',
                country_code: 'CA',
            },
        },
    };

    function standing(over: any) {
        return {
            cust_id: 174470,
            position: 1,
            position_previous: 1,
            position_change: 0,
            total_points: 100,
            race_points: 100,
            bonus_points: 0,
            penalty_points: 0,
            stage_points: 0,
            starts: 2,
            wins: 1,
            stage_wins: 0,
            poles: 1,
            podiums: 2,
            top_5: 2,
            top_10: 2,
            laps: 40,
            laps_led: 10,
            incidents: 3,
            corners: 500,
            miles: 90,
            rating: 900,
            races_counted: 2,
            counted_races: [
                [86551649, -2],
                [86551649, 0],
            ],
            dropped_races: [],
            is_provisional: false,
            car_ids: [152],
            ...over,
        };
    }

    // Two drivers tied on 17, one debutant carrying the -1 sentinel.
    const STANDINGS: any = {
        league_id: 4534,
        season_id: 134456,
        class_id: 0,
        drivers: {
            '174470': standing({}),
            '201632': standing({
                cust_id: 201632,
                position: 17,
                total_points: 40,
            }),
            '999999': standing({
                cust_id: 999999,
                position: 17,
                position_previous: -1,
                position_change: -15,
                total_points: 40,
                starts: 2,
                counted_races: [],
                dropped_races: [],
            }),
        },
        teams: {},
    };

    const SRH: any = {
        info: INFO,
        standings: STANDINGS,
        facts: {
            seasonName: 'Season 19',
            seriesName: 'Formula Series',
            leagueName: 'League Zero',
            dropWeeks: 1,
            keepWeeks: 4,
            classes: INFO.classes,
            classId: 0,
            progress: {
                roundsRun: 1,
                roundsTotal: 1,
                racesRun: 2,
                nextEventAt: null,
            },
            schedule: INFO.schedule,
            teams: [],
            info: INFO,
        },
    };

    async function build(summary = false) {
        return await buildSrhStandingsModel(
            '4534',
            '134456',
            SRH,
            null,
            {},
            {},
            summary
        );
    }

    it('takes position from the standings, not the array index', async () => {
        const positions = (await build()).drivers.map((d) => d.position);
        expect(positions).toEqual([1, 17, 17]);
    });

    it('marks tied positions', async () => {
        const tied = (await build()).drivers.filter((d) => d.srh?.isTied);
        expect(tied).toHaveLength(2);
        expect(tied.every((d) => d.position === 17)).toBe(true);
    });

    // The sentinel makes position_change meaningless — a debutant must not
    // render as a 15-place drop.
    it('leaves positionChange undefined for a new entrant', async () => {
        const newcomer = (await build()).drivers.find(
            (d) => d.custId === '999999'
        )!;
        expect(newcomer.positionChange).toBeUndefined();
        expect(newcomer.srh?.delta).toEqual({ kind: 'new' });
    });

    it('sets positionChange for an established driver', async () => {
        const leader = (await build()).drivers.find(
            (d) => d.custId === '174470'
        )!;
        expect(leader.positionChange).toBe(0);
    });

    it('computes gap to leader from the lowest position, not drivers[0]', async () => {
        const rows = (await build()).drivers;
        expect(
            rows.find((d) => d.custId === '174470')!.pointsBehindLeader
        ).toBe(0);
        expect(
            rows.find((d) => d.custId === '201632')!.pointsBehindLeader
        ).toBe(60);
    });

    it('uses the sort_name split for driver names', async () => {
        const leader = (await build()).drivers.find(
            (d) => d.custId === '174470'
        )!;
        expect(leader.firstName).toBe('Alpha');
        expect(leader.lastName).toBe('One');
    });

    it('intersects counted races against the season’s raced sessions', async () => {
        const leader = (await build()).drivers.find(
            (d) => d.custId === '174470'
        )!;
        expect(leader.srh?.counted).toHaveLength(2);
        expect(leader.srh?.unattributedStarts).toBe(0);
    });

    it('reports starts no session accounts for', async () => {
        const newcomer = (await build()).drivers.find(
            (d) => d.custId === '999999'
        )!;
        expect(newcomer.srh?.unattributedStarts).toBe(2);
    });

    it('attaches season facts', async () => {
        const m = await build();
        expect(m.srh?.seasonName).toBe('Season 19');
        expect(m.srh?.dropWeeks).toBe(1);
    });

    it('still trims to the top 4 in summary mode', async () => {
        expect((await build(true)).drivers.length).toBeLessThanOrEqual(4);
    });

    // Guard for the surfaces that must never render these.
    it('does not expose stage points or wins on a driver', async () => {
        const leader = (await build()).drivers.find(
            (d) => d.custId === '174470'
        )!;
        expect(leader.srh).not.toHaveProperty('stagePoints');
        expect(leader.srh).not.toHaveProperty('stageWins');
    });
});

describe('getDefaultStandingsModel — fallback shape', () => {
    // The regression guard: consumers that predate this feature must see
    // exactly what they always saw.
    it('carries no srh facts', () => {
        const m = getDefaultStandingsModel();
        expect(m.srh).toBeUndefined();
        expect(Object.keys(m).sort()).toEqual([
            'drivers',
            'leagueId',
            'seasonId',
            'teams',
        ]);
    });
});
