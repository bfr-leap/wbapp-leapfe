/**
 * Pure derivations over `ldata-srhweb` championship documents.
 *
 * Everything here is a plain function over already-fetched documents — no I/O,
 * so it is all directly unit-testable. The fetching and the assembly into the
 * view model live in `driver-standings-model.ts`.
 *
 * The dataset has a number of traps that make a naive rendering wrong rather
 * than merely ugly. Each helper below exists because of one of them; the
 * reasons are on the functions.
 */

import type {
    SeasonInfo,
    SeasonStandings,
    DriverStanding,
    TeamStanding,
    RaceResult,
    SessionKey,
} from '@@/src/services/srhweb-types';

// ---------------------------------------------------------------------------
// Session keys
// ---------------------------------------------------------------------------

/**
 * Stable string id for a `[subsession_id, simsession_number]` pair.
 *
 * `SessionKey` is a tuple, and arrays compare by reference — they cannot be
 * Set members or Map keys. Every set-intersection below goes through this.
 */
export function sessionKeyId(key: SessionKey): string {
    // `-0` and `0` stringify differently (`"0"` vs `"0"` — but `String(-0)` is
    // `"0"`, while template interpolation of -0 is also "0"); normalise via
    // arithmetic so the two can never diverge.
    return `${key[0]}:${key[1] + 0}`;
}

export function parseSessionKeyId(id: string): SessionKey {
    const [sub, sim] = id.split(':');
    return [Number(sub), Number(sim)];
}

/**
 * Every sim session of a season that has been run and resolved, in calendar
 * then session order — races only.
 *
 * Two things this must get right:
 *  - Events with `subsession_id === null` are excluded. They are either unrun
 *    or scored by simracerhub but not yet resolved against `ldata-irweb`, and
 *    either way they cannot address a results document.
 *  - A heat-racing event scores championship points at a NEGATIVE session
 *    number (-2 alongside the feature at 0). Filtering on the session number
 *    rather than `is_race` halves such a season.
 */
export function listRacedSessionKeys(info: SeasonInfo): SessionKey[] {
    return info.schedule.flatMap((event) =>
        event.subsession_id === null
            ? []
            : event.sessions
                  .filter((s) => s.is_race)
                  .map(
                      (s): SessionKey => [
                          event.subsession_id as number,
                          s.simsession_number,
                      ]
                  )
    );
}

/** Every resolved sim session, races and non-races alike. */
export function listAllSessionKeys(info: SeasonInfo): SessionKey[] {
    return info.schedule.flatMap((event) =>
        event.subsession_id === null
            ? []
            : event.sessions.map(
                  (s): SessionKey => [
                      event.subsession_id as number,
                      s.simsession_number,
                  ]
              )
    );
}

// ---------------------------------------------------------------------------
// Drop weeks
// ---------------------------------------------------------------------------

export interface DriverRaceLedger {
    /** Races that scored, in calendar order. */
    counted: SessionKey[];
    /** Races dropped under the season's drop-week rules. */
    dropped: SessionKey[];
    /**
     * Starts the standings claim that no session key accounts for.
     *
     * simracerhub scores an event as soon as it runs, but the producer can
     * only file its results once `ldata-irweb` has resolved the subsession.
     * In between, `starts` and `total_points` include a race that has no key
     * and no results document anywhere. Naming the gap is the only honest
     * rendering — see `reconcilePoints`.
     */
    unattributedStarts: number;
}

/**
 * Split a driver's season into the races that counted and the races that were
 * dropped.
 *
 * `counted_races` and `dropped_races` are NOT race lists — they include
 * practice and qualifying. One real driver's `counted_races` has 25 entries
 * for 10 races, and `dropped_races` is always a whole event's five sessions of
 * which two are races. Intersecting with the season's raced sessions is
 * mandatory; `counted_races.length` is never a race count.
 */
export function splitDriverRaceLedger(
    standing: DriverStanding,
    racedKeyIds: ReadonlySet<string>
): DriverRaceLedger {
    const pick = (keys: SessionKey[]) =>
        keys.filter((k) => racedKeyIds.has(sessionKeyId(k)));

    const counted = pick(standing.counted_races ?? []);
    const dropped = pick(standing.dropped_races ?? []);

    return {
        counted,
        dropped,
        // Clamped: a standings/schedule disagreement must never produce a
        // negative count that renders as "-2 starts".
        unattributedStarts: Math.max(
            0,
            standing.starts - counted.length - dropped.length
        ),
    };
}

export interface PointsReconciliation {
    /** Points recoverable from race documents we can actually address. */
    attributed: number;
    /** Points the standings total includes that we cannot itemise. */
    unattributed: number;
    /** True only when every point in the total is accounted for. */
    isComplete: boolean;
}

/**
 * Reconcile a driver's season total against the race rows behind it.
 *
 * Pass `null` for `countedRows` when the per-race documents have not been
 * loaded. That yields `isComplete: false` and zero attributed — deliberately
 * indistinguishable in the type from "loaded and found nothing", so a caller
 * cannot render an un-loaded state as a measured zero.
 */
export function reconcilePoints(
    standing: DriverStanding,
    countedRows: RaceResult[] | null
): PointsReconciliation {
    if (countedRows === null) {
        return {
            attributed: 0,
            unattributed: standing.total_points,
            isComplete: false,
        };
    }
    // Negative race totals are legal — a driver can finish with a penalty
    // exceeding their points — so this sum is not monotonic.
    const attributed = countedRows.reduce((sum, r) => sum + r.total_points, 0);
    const unattributed = standing.total_points - attributed;
    return { attributed, unattributed, isComplete: unattributed === 0 };
}

// ---------------------------------------------------------------------------
// Points breakdown
// ---------------------------------------------------------------------------

export interface PointsBreakdown {
    race: number;
    bonus: number;
    /** Positive magnitude, as published. */
    penalty: number;
    /** Pre-signed for display, so no call site re-signs it. */
    penaltyDisplay: string;
    total: number;
    /** False when the parts do not sum to the total — suppress the bar. */
    balances: boolean;
}

/**
 * The race / bonus / penalty split behind a points total.
 *
 * `penalty_points` is published as a positive magnitude and SUBTRACTS. Every
 * row in the sample satisfies `race + bonus - penalty === total`; when it
 * doesn't, `balances` is false and the caller should show the total alone
 * rather than a breakdown that visibly fails to add up.
 *
 * `stage_points` is deliberately absent — it is 0 for every driver and every
 * team in the dataset, and rendering it would assert the league runs stage
 * racing.
 */
export function pointsBreakdown(
    standing: DriverStanding | TeamStanding
): PointsBreakdown {
    const race = standing.race_points ?? 0;
    const bonus = standing.bonus_points ?? 0;
    const penalty = standing.penalty_points ?? 0;
    const total = standing.total_points ?? 0;
    return {
        race,
        bonus,
        penalty,
        penaltyDisplay: penalty === 0 ? '0' : `−${penalty}`,
        total,
        balances: race + bonus - penalty === total,
    };
}

// ---------------------------------------------------------------------------
// Position
// ---------------------------------------------------------------------------

export type PositionDelta =
    | { kind: 'new' }
    | { kind: 'change'; change: number };

/**
 * How a driver's position moved since the last event.
 *
 * `position_previous === -1` is a NEW ENTRANT sentinel, not a position. The
 * accompanying `position_change` is computed from it and comes out wildly
 * negative — one real debutant carries `-15`, which renders as a red ▼15 for
 * a driver who simply did not exist last week. The `new` variant makes that
 * number unreachable rather than merely discouraged.
 */
export function positionDelta(standing: DriverStanding): PositionDelta {
    if (standing.position_previous === -1) return { kind: 'new' };
    return { kind: 'change', change: standing.position_change ?? 0 };
}

/**
 * Attach tie flags without renumbering.
 *
 * Championship positions tie, and a tie leaves a gap: the sample runs
 * `… 17, 17, 19, 19, 21 …`. Deriving rank from an array index would renumber
 * those to 17, 18, 19, 20 — quietly promoting three drivers.
 */
export function rankByPosition<T extends { position: number }>(
    rows: T[]
): (T & { isTied: boolean })[] {
    const counts = new Map<number, number>();
    for (const r of rows) {
        counts.set(r.position, (counts.get(r.position) ?? 0) + 1);
    }
    return rows
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((r) => ({ ...r, isTied: (counts.get(r.position) ?? 0) > 1 }));
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

const ENTITIES: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    '#39': "'",
    '#x27': "'",
    '#x2F': '/',
    nbsp: ' ',
};

/**
 * Decode the HTML entities simracerhub leaves in team names
 * (`"Arrive &amp; Drive Racing"`).
 *
 * Single pass on purpose: `&amp;amp;` decodes to `&amp;`, not `&`. And no
 * `document.createElement('textarea')` — this runs during SSR.
 */
export function decodeHtmlEntities(value: string): string {
    return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, name) => {
        const known = ENTITIES[name] ?? ENTITIES[String(name).toLowerCase()];
        if (known !== undefined) return known;
        if (/^#\d+$/.test(name)) {
            return String.fromCodePoint(Number(name.slice(1)));
        }
        if (/^#x[0-9a-fA-F]+$/i.test(name)) {
            return String.fromCodePoint(parseInt(name.slice(2), 16));
        }
        return match;
    });
}

/**
 * Format a srhweb lap time (10,000ths of a second) as `m:ss.SSS`.
 *
 * `-1` is the dataset's "no time set" sentinel and appears on real rows —
 * qualifying times for drivers who never set one, fastest laps for
 * non-starters. Formatting it as a duration yields a negative time. Returns
 * `null` for every non-time so callers render a dash.
 */
export function formatSrhLapTime(
    ticks: number | null | undefined
): string | null {
    if (ticks === null || ticks === undefined) return null;
    if (!Number.isFinite(ticks) || ticks <= 0) return null;
    const totalSeconds = ticks / 10000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds - minutes * 60;
    const secStr = seconds.toFixed(3).padStart(6, '0');
    return `${minutes}:${secStr}`;
}

/**
 * A race row's rating, or null when the row was never measured.
 *
 * Every other race analytic (`passes`, `avg_pos`, `num_fast_laps`, …) is null
 * for a driver who barely started — 15 such rows in the sample, all with a
 * lap or two and often `status: "Disconnected"`. `rating` alone is never null
 * there: 14 of the 15 come through as `0`, and one carries a real-looking
 * `88.1481` off a single lap.
 *
 * So the rule is the row, not the value: if nothing else about the drive was
 * measured, the rating is not comparable to one earned over a full race, and
 * this returns null either way. Averaging the raw field instead drags the
 * field down with zeroes AND mixes in a rating from a one-lap run.
 */
export function srhRaceRating(row: RaceResult): number | null {
    const measured =
        row.passes !== null ||
        row.avg_pos !== null ||
        row.num_fast_laps !== null ||
        row.closing_passes !== null ||
        row.quality_passes !== null;
    return measured ? row.rating : null;
}

// ---------------------------------------------------------------------------
// Season shape
// ---------------------------------------------------------------------------

export interface SeasonProgress {
    /** Events with a resolved subsession. */
    roundsRun: number;
    /** Events on the calendar, run or not. */
    roundsTotal: number;
    /** Race sessions available, heats included. */
    racesRun: number;
    /** Epoch milliseconds of the next unrun event, or null. */
    nextEventAt: number | null;
}

/**
 * How far into the season we are.
 *
 * Derived from the schedule, never from `is_provisional` — that flag is
 * `false` on every driver, team and result row in the dataset even with six of
 * eleven events unraced, so it cannot mean "final".
 *
 * `race_date` is epoch SECONDS; the ×1000 is why this is a function.
 */
export function seasonProgress(info: SeasonInfo): SeasonProgress {
    const run = info.schedule.filter((e) => e.subsession_id !== null);
    const next = info.schedule.find((e) => e.subsession_id === null);
    return {
        roundsRun: run.length,
        roundsTotal: info.schedule.length,
        racesRun: listRacedSessionKeys(info).length,
        nextEventAt: next ? next.race_date * 1000 : null,
    };
}

/**
 * A display label for a calendar event.
 *
 * `event_name` is null on every event in the dataset, so the track is the
 * real label. Appends the configuration only when it adds something.
 */
export function eventLabel(event: {
    event_name: string | null;
    track: { track_name: string; config_name: string };
}): string {
    if (event.event_name) return event.event_name;
    const track = event.track?.track_name ?? '';
    const config = event.track?.config_name ?? '';
    if (!track) return config || 'TBD';
    if (!config || track.includes(config)) return track;
    return `${track} — ${config}`;
}

// ---------------------------------------------------------------------------
// Teams
// ---------------------------------------------------------------------------

export interface SrhTeamRow {
    teamId: number;
    teamName: string;
    position: number;
    isTied: boolean;
    points: PointsBreakdown;
    positionChange: number;
    custIds: number[];
    driverNames: string[];
    /**
     * Roster SUMS, deliberately named so no template can share a column
     * header with the driver table. A nine-driver team reaches 14 podiums in
     * a ten-race season; under a header reading "Podiums" that is nonsense.
     */
    rosterStarts: number;
    rosterRacesCounted: number;
    rosterWins: number;
    rosterPodiums: number;
    rosterPoles: number;
    rosterIncidents: number;
}

export function buildSrhTeamRows(
    standings: SeasonStandings,
    info: SeasonInfo | null
): SrhTeamRow[] {
    const teams = Object.values(standings.teams ?? {});
    if (teams.length === 0) return [];

    const nameOf = (custId: number): string => {
        const d = info?.drivers?.[String(custId)];
        return d ? d.display_name : `#${custId}`;
    };

    const rows = teams.map((t) => ({
        teamId: t.team_id,
        teamName: decodeHtmlEntities(t.team_name ?? ''),
        position: t.position,
        points: pointsBreakdown(t),
        positionChange: t.position_change ?? 0,
        custIds: t.cust_ids ?? [],
        driverNames: (t.cust_ids ?? []).map(nameOf),
        rosterStarts: t.starts ?? 0,
        rosterRacesCounted: t.races_counted ?? 0,
        rosterWins: t.wins ?? 0,
        rosterPodiums: t.podiums ?? 0,
        rosterPoles: t.poles ?? 0,
        rosterIncidents: t.incidents ?? 0,
    }));

    return rankByPosition(rows);
}

// ---------------------------------------------------------------------------
// Drivers
// ---------------------------------------------------------------------------

export interface DriverDisplay {
    firstName: string;
    lastName: string;
    countryCode: string | null;
}

/**
 * Split a driver's name for the existing driver-tag components.
 *
 * Prefers srhweb's `sort_name`, which is already `"Last, First"` — splitting
 * `display_name` on whitespace mis-handles multi-word surnames. Falls back
 * through `display_name` to the bare id so an unknown driver renders as
 * `#123456` rather than `undefined undefined`.
 */
export function driverDisplay(
    custId: number,
    info: SeasonInfo | null
): DriverDisplay {
    const d = info?.drivers?.[String(custId)];
    if (!d) return { firstName: '', lastName: `#${custId}`, countryCode: null };

    if (d.sort_name && d.sort_name.includes(',')) {
        const [last, first] = d.sort_name.split(',');
        return {
            firstName: (first ?? '').trim(),
            lastName: (last ?? '').trim(),
            countryCode: d.country_code,
        };
    }
    const parts = (d.display_name ?? '').trim().split(/\s+/);
    return {
        firstName: parts.length > 1 ? parts[0] : '',
        lastName:
            parts.length > 1
                ? parts.slice(1).join(' ')
                : parts[0] || `#${custId}`,
        countryCode: d.country_code,
    };
}
