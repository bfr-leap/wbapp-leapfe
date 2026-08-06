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

import {
    getSrhSeasonInfo,
    getSrhSeasonStandings,
} from '@@/src/services/srhweb-service';
import type {
    SeasonInfo,
    SeasonStandings,
    SessionKey,
} from '@@/src/services/srhweb-types';
import {
    listRacedSessionKeys,
    sessionKeyId,
    splitDriverRaceLedger,
    pointsBreakdown,
    positionDelta,
    rankByPosition,
    seasonProgress,
    buildSrhTeamRows,
    driverDisplay,
    type PointsBreakdown,
    type PositionDelta,
    type SeasonProgress,
    type SrhTeamRow,
} from './srh-standings-model';

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
    /** Present only when this league's standings come from srhweb. */
    srh?: SrhDriverFacts;
}

/**
 * Per-driver facts that only exist when the league is on simracerhub.
 */
export interface SrhDriverFacts {
    custId: number;
    /** Tied with at least one other driver on this position. */
    isTied: boolean;
    /** Race / bonus / penalty split behind the total. */
    points: PointsBreakdown;
    /** `new` for a debutant — see `positionDelta`. */
    delta: PositionDelta;
    /** Races that scored, and races the drop-week rules discarded. */
    counted: SessionKey[];
    dropped: SessionKey[];
    /** Starts the standings claim that no race document accounts for. */
    unattributedStarts: number;
    starts: number;
    racesCounted: number;
    wins: number;
    poles: number;
    podiums: number;
    top5: number;
    top10: number;
    lapsLed: number;
    incidents: number;
    /** simracerhub's own season rating. NOT the per-race rating — different
     *  scale entirely, so it must never share a label with one. */
    seasonRating: number;
}

/**
 * Season-level facts that only exist when the league is on simracerhub.
 */
export interface SrhSeasonFacts {
    seasonName: string;
    seriesName: string;
    leagueName: string;
    /** Null when the season sets no such rule. */
    dropWeeks: number | null;
    keepWeeks: number | null;
    classes: { class_id: number; class_name: string }[];
    /** The class these standings are for. */
    classId: number;
    progress: SeasonProgress;
    /** Calendar, including events not yet run — those carry a null subsession. */
    schedule: SeasonInfo['schedule'];
    /** Real team championship, empty for seasons that don't run one. */
    teams: SrhTeamRow[];
    /** The raw season document, for the surfaces that need the schedule. */
    info: SeasonInfo;
}

export interface DriverStandingsModel {
    leagueId: string;
    seasonId: string;
    drivers: DriverModel[];
    teams: TeamModel[];
    /**
     * Present only when `ldata-srhweb` covers this league and season —
     * i.e. when the league scores its championship on simracerhub.
     *
     * When absent, every field above means exactly what it always did: the
     * ranking is this app's own `power_points` computation. When present, the
     * ranking and points are the league's authoritative published standings,
     * and the extra surfaces (drop weeks, stewarding, real teams) have data
     * behind them. Consumers that don't know about `srh` are unaffected.
     */
    srh?: SrhSeasonFacts;
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
    >await Promise.all([
        // These four are independent — awaiting them in sequence inside an
        // array literal (as this did) serialised four round trips for no
        // reason.
        getLeagueDriverStats(league),
        getCuratedLeagueTeamsInfo(league),
        getMembersData(league, season),
        getSeasonSimsessionIndex(league),
    ]);

    if (isNaN(Number.parseInt(season))) {
        season = '';
    }

    // Probe srhweb with the season the caller actually asked for, BEFORE the
    // resolution loop below can rewrite it.
    //
    // That loop exists to pick a sensible default when `season` is empty or
    // unknown, and it decides using `ldata-rsltsts`' simsession index. But
    // srhweb is a different producer with its own coverage: a league can have
    // a season scored on simracerhub that the rsltsts index has not caught up
    // with. Resolving first would silently redirect an explicit request for
    // that season to a different one and then report "no srhweb data" for it.
    let srh = season ? await buildSrhFacts(league, season) : null;

    let selectedSeason = _seasonSimsessionIndex?.find(
        (s) => s.season_id.toString() === season
    );

    if (!selectedSeason && !srh) {
        for (let i = 0; i < (_seasonSimsessionIndex?.length || 0); ++i) {
            if (_seasonSimsessionIndex?.[i].sessions.length > 0) {
                selectedSeason = _seasonSimsessionIndex?.[i];
                break;
            }
        }
        season = selectedSeason?.season_id?.toString() || '';
        // The default we landed on may itself be an srhweb season.
        if (season) {
            srh = await buildSrhFacts(league, season);
        }
    }

    let _seasonId = Number.parseInt(season);

    const { userTeamIdMap, teamInfoMap } = populateTeamInfoMaps(
        _curatedLeagueTeamsInfo,
        _seasonId
    );

    // `srh` was resolved above, before the season could be rewritten.
    //
    // Deliberately not gated on `summary_mode`: the home page's summary card
    // links to this same view, and ranking one by `power_points` and the other
    // by championship points would put two different orders on one screen.
    if (srh) {
        return buildSrhStandingsModel(
            league,
            season,
            srh,
            _membersData,
            userTeamIdMap,
            teamInfoMap,
            summary_mode
        );
    }

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
 * Fetch and assemble the srhweb season facts, or null when this league and
 * season aren't in that dataset — which is the common case, and not an error.
 *
 * Returns null rather than throwing on every failure path: a missing document,
 * an unscored season, a broker hiccup. The caller falls back to the computed
 * standings, so the page degrades to what it rendered before this feature
 * existed rather than to an error state.
 */
async function buildSrhFacts(
    league: string,
    season: string
): Promise<{
    facts: SrhSeasonFacts;
    standings: SeasonStandings;
    info: SeasonInfo;
} | null> {
    if (!league || !season) return null;

    const info = await getSrhSeasonInfo(league, season).catch(() => null);
    if (!info || !Array.isArray(info.classes) || info.classes.length === 0) {
        return null;
    }

    // Every season in the lake is single-class, but the loop is the correct
    // shape and costs nothing. The first class with a standings document wins
    // — a class selector is a later concern, and multi-class is untested.
    const perClass = await Promise.all(
        info.classes.map((c) =>
            getSrhSeasonStandings(league, season, c.class_id).catch(() => null)
        )
    );
    const idx = perClass.findIndex((s) => s && s.drivers);
    if (idx === -1) return null;
    const standings = perClass[idx] as SeasonStandings;

    return {
        info,
        standings,
        facts: {
            seasonName: info.season_name,
            seriesName: info.series_name,
            leagueName: info.league_name,
            dropWeeks: info.drop_weeks,
            keepWeeks: info.keep_weeks,
            classes: info.classes,
            classId: info.classes[idx].class_id,
            progress: seasonProgress(info),
            schedule: info.schedule,
            teams: buildSrhTeamRows(standings, info),
            info,
        },
    };
}

/**
 * Build the view model from srhweb's published standings.
 *
 * Identity (licence, iRating, club, team chrome) still comes from
 * `membersData` so `driver-tag.vue` renders exactly as it does on the
 * fallback path — srhweb carries none of that. What changes is the ranking,
 * the points, and everything hanging off them.
 */
export function buildSrhStandingsModel(
    league: string,
    season: string,
    srh: {
        facts: SrhSeasonFacts;
        standings: SeasonStandings;
        info: SeasonInfo;
    },
    membersData: MembersData | null,
    userTeamIdMap: Record<number, number>,
    teamInfoMap: Record<number, CLTI_Team>,
    summary_mode: boolean
): DriverStandingsModel {
    const { facts, standings, info } = srh;

    const racedKeyIds = new Set(listRacedSessionKeys(info).map(sessionKeyId));
    const memberByCust = new Map<number, M_Member>();
    for (const m of membersData?.members || []) {
        memberByCust.set(m.cust_id, m);
    }

    const ranked = rankByPosition(Object.values(standings.drivers || {}));

    // The leader is the driver on the lowest position, NOT the first array
    // entry — positions tie, and the array is only sorted because we sorted it.
    const leaderPoints = ranked.length ? ranked[0].total_points : 0;

    const allDrivers: DriverModel[] = ranked.map((standing) => {
        const member = memberByCust.get(standing.cust_id);
        const ledger = splitDriverRaceLedger(standing, racedKeyIds);
        const delta = positionDelta(standing);

        // Prefer srhweb's own name: `sort_name` is already "Last, First",
        // where splitting `display_name` mis-handles multi-word surnames.
        const display = driverDisplay(standing.cust_id, info);
        const memberView = member
            ? getMemberViewFromM_Member(member, userTeamIdMap, teamInfoMap)
            : null;

        return {
            position: standing.position,
            points: standing.total_points,
            clubId: memberView?.clubId ?? 0,
            firstName: display.firstName || memberView?.firstName || '',
            lastName: display.lastName || memberView?.lastName || '',
            iRating: memberView?.iRating ?? '',
            licenseLevel: memberView?.licenseLevel ?? '',
            safetyRating: memberView?.safetyRating ?? '',
            // srhweb team IDs are simracerhub's own space and don't resolve in
            // this app; the curated map is the only linkable one.
            teamName: memberView?.teamName ?? '',
            teamId: memberView?.teamId ?? 0,
            showStats: false,
            custId: standing.cust_id.toString(),
            stats: {
                started: standing.starts,
                poles: standing.poles,
                wins: standing.wins,
                podiums: standing.podiums,
                top10: standing.top_10,
                top20: -1,
            },
            pointsBehindLeader: leaderPoints - standing.total_points,
            // Deliberately NOT set from srhweb for a debutant: the sentinel
            // makes `position_change` meaningless there.
            positionChange: delta.kind === 'change' ? delta.change : undefined,
            srh: {
                custId: standing.cust_id,
                isTied: standing.isTied,
                points: pointsBreakdown(standing),
                delta,
                counted: ledger.counted,
                dropped: ledger.dropped,
                unattributedStarts: ledger.unattributedStarts,
                starts: standing.starts,
                racesCounted: standing.races_counted,
                wins: standing.wins,
                poles: standing.poles,
                podiums: standing.podiums,
                top5: standing.top_5,
                top10: standing.top_10,
                lapsLed: standing.laps_led,
                incidents: standing.incidents,
                seasonRating: standing.rating,
            },
        } as DriverModel;
    });

    const ret: DriverStandingsModel = getDefaultStandingsModel();
    ret.leagueId = league;
    ret.seasonId = season;
    ret.drivers = summary_mode ? allDrivers.slice(0, 4) : allDrivers;
    // Curated teams stay on the existing path — srhweb's real team
    // championship renders in its own component, where roster sums can be
    // labelled as such.
    ret.teams = buildTeamStandings(allDrivers, summary_mode);
    ret.srh = facts;
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
                ssi?.simsessions.find((s) => s.type === 'race')
                    ?.simsession_id ?? ssi?.simsessions[0]?.simsession_id;
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
