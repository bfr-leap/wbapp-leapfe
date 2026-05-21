import type {
    MembersData,
    M_Member,
    SeasonSimsessionIndex,
    CuratedLeagueTeamsInfo,
    CLTI_Team,
    DriverStatsMap,
    SimsessionResults,
} from 'lplib/endpoint-types/iracing-endpoints';

import {
    getMemberViewFromM_Member,
    getFormulaLicense,
} from '@@/src/utils/driver-utils';

import {
    getCuratedLeagueTeamsInfo,
    getLeagueDriverStats,
    getLeagueSeasonSessions,
    getMembersData,
    getSeasonSimsessionIndex,
    getSimsessionResults,
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
    /** Points behind the championship leader. Undefined when no
     *  standings exist yet (empty field). 0 for the leader. */
    pointsBehindLeader?: number;
    /** Finishing positions in the most recent races, oldest→newest.
     *  `null` for races the driver didn't participate in (DNS).
     *  Empty array when there are no completed races yet. */
    recentFinishes?: (number | null)[];
    /** Position change vs. the standings as they would have stood
     *  before the most recent race. Positive = moved up, negative =
     *  moved down, 0 = unchanged. Undefined when there's no prior
     *  race to compare against (first round, or empty field). */
    positionChange?: number;
}

export interface DriverStandingsModel {
    leagueId: string;
    seasonId: string;
    drivers: DriverModel[];
    teams: TeamModel[];
}

export function getDefaultStandingsModel(): DriverStandingsModel {
    return { leagueId: '', seasonId: '', drivers: [], teams: [] };
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

    let season = leagueTeamsInfo?.seasons.find((s) => s.season_id === seasonId);
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

    let teamsA = Object.values(teamViewMap).sort((a, b) => b.points - a.points);

    teamsA.forEach((v, i) => {
        v.position = i + 1;
    });

    if (summaryMode) {
        teamsA = teamsA.filter((v) => v.position <= 3);
    }

    return teamsA;
}

/** How many races back the form-strip dots cover. */
export const RECENT_FORM_WINDOW = 3;

/**
 * For one driver, project their finishing positions across the
 * supplied races (chronological, oldest→newest). `null` means the
 * driver did not appear in that race's result set.
 *
 * Exported for testing.
 */
export function computeRecentFinishes(
    custId: string,
    races: (SimsessionResults | null)[]
): (number | null)[] {
    const id = Number.parseInt(custId);
    return races.map((race) => {
        if (!race?.results) return null;
        const entry = race.results.find((r) => r.cust_id === id);
        return entry ? entry.position : null;
    });
}

/**
 * Reconstruct standings as they stood before the most recent race
 * by subtracting that race's points from each driver's total, then
 * re-ranking. Returns position change per driver
 * (positive = moved up, 0 = unchanged, negative = lost ground).
 *
 * Exported for testing.
 */
export function computePositionChanges(
    drivers: { custId: string; position: number; points: number }[],
    lastRace: SimsessionResults | null
): Map<string, number> {
    const changes = new Map<string, number>();
    if (!lastRace?.results || lastRace.results.length === 0) {
        return changes;
    }

    const lastRacePoints = new Map<string, number>();
    for (const r of lastRace.results) {
        lastRacePoints.set(r.cust_id.toString(), r.points || 0);
    }

    const previous = drivers
        .map((d) => ({
            custId: d.custId,
            prev: (d.points || 0) - (lastRacePoints.get(d.custId) ?? 0),
        }))
        .sort((a, b) => b.prev - a.prev);

    previous.forEach((p, i) => {
        const current = drivers.find((d) => d.custId === p.custId);
        if (current) {
            // Positive = climbed (lower position number is better).
            changes.set(p.custId, i + 1 - current.position);
        }
    });

    return changes;
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
            SeasonSimsessionIndex[] | null
        ]
    >[
        await getLeagueDriverStats(league),
        await getCuratedLeagueTeamsInfo(league),
        await getMembersData(league, season),
        await getSeasonSimsessionIndex(league),
    ];

    if (isNaN(Number.parseInt(season))) {
        season = '';
    }

    let selectedSeason = _seasonSimsessionIndex?.find(
        (s) => s.season_id.toString() === season
    );

    if (!selectedSeason) {
        for (let i = 0; i < (_seasonSimsessionIndex?.length || 0); ++i) {
            if (_seasonSimsessionIndex?.[i].sessions.length > 0) {
                selectedSeason = _seasonSimsessionIndex?.[i];
                break;
            }
        }
        season = selectedSeason?.season_id?.toString() || '';
    }

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
    ret.leagueId = league;
    ret.seasonId = season;
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

    await enrichWithRecentForm(allDrivers, league, season, selectedSeason);

    return ret;
}

/**
 * Layers narrative fields onto the already-ranked drivers:
 *   - `pointsBehindLeader` from the head of `allDrivers`
 *   - `recentFinishes` from the last `RECENT_FORM_WINDOW` races
 *   - `positionChange` derived from the most recent race
 *
 * Mutates the entries in place. All extra broker calls are gated on
 * the existence of past races; any failure degrades silently
 * (cards/rows just won't show the narrative chrome).
 */
async function enrichWithRecentForm(
    allDrivers: DriverModel[],
    league: string,
    season: string,
    selectedSeason: SeasonSimsessionIndex | undefined
): Promise<void> {
    if (allDrivers.length === 0) return;

    const leader = allDrivers[0];
    const leaderPoints = leader.points || 0;
    for (const d of allDrivers) {
        d.pointsBehindLeader = leaderPoints - (d.points || 0);
    }

    if (!selectedSeason || !league || !season) return;

    let leagueSeasonSessions = await getLeagueSeasonSessions(
        league,
        season
    ).catch(() => null);
    const sessions = leagueSeasonSessions?.sessions || [];
    const now = Date.now();
    const pastByDateDesc = sessions
        .filter(
            (s) =>
                s?.subsession_id &&
                s.launch_at &&
                Date.parse(s.launch_at) <= now
        )
        .sort((a, b) => Date.parse(b.launch_at) - Date.parse(a.launch_at));

    if (pastByDateDesc.length === 0) return;

    const recentPastDesc = pastByDateDesc.slice(0, RECENT_FORM_WINDOW);

    const recentRacesNewestFirst = await Promise.all(
        recentPastDesc.map(async (sess) => {
            const ssi = selectedSeason.sessions.find(
                (s) => s.subsession_id === sess.subsession_id
            );
            const raceSim =
                ssi?.simsessions.find((s) => s.type === 'race')?.simsession_id ??
                ssi?.simsessions[0]?.simsession_id;
            if (raceSim === undefined) return null;
            return await getSimsessionResults(
                sess.subsession_id.toString(),
                raceSim.toString()
            ).catch(() => null);
        })
    );

    // Form strip wants chronological order (oldest → newest, left to right).
    const recentRacesChronological = [...recentRacesNewestFirst].reverse();
    for (const d of allDrivers) {
        d.recentFinishes = computeRecentFinishes(
            d.custId,
            recentRacesChronological
        );
    }

    const changes = computePositionChanges(
        allDrivers.map(({ custId, position, points }) => ({
            custId,
            position,
            points,
        })),
        recentRacesNewestFirst[0]
    );
    for (const d of allDrivers) {
        const c = changes.get(d.custId);
        if (c !== undefined) {
            d.positionChange = c;
        }
    }
}
