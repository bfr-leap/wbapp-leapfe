/**
 * Steward rulings model — fetches rulings for a league/season and
 * computes the client-side aggregates the UI needs (driver license
 * standings, totals, etc.).
 *
 * No rulebook thresholds are encoded here. Aggregates are raw counts
 * and sums; threshold-based UI must come from configuration.
 */

import type { StewardRuling } from '@@/lplib/endpoint-types/iracing-endpoints';
import { getRulings } from '@@/src/services/steward-service';
import { getLeagueRoster } from '@@/src/services/league-service';

export interface DriverLicenseStanding {
    /** Stable identifier — discord_user_id when present, else driver_id. */
    key: string;
    discordUserId?: string;
    driverId?: number;
    driverName: string;
    totalLicensePoints: number;
    totalRulings: number;
    totalChampionshipPointDeduction: number;
}

export type DriverNameMap = { [custId: number]: string };

export interface StewardRulingsModel {
    rulings: StewardRuling[];
    standings: DriverLicenseStanding[];
    /**
     * iRacing cust_id → display name, built from the league roster.
     * Used to show real driver names on rulings that only carry a
     * `driver_id` and no `driver_name`.
     */
    driverNameMap: DriverNameMap;
}

export function getDefaultStewardRulingsModel(): StewardRulingsModel {
    return { rulings: [], standings: [], driverNameMap: {} };
}

/**
 * Coerce a possibly-stringified driver id to a number, or null.
 */
function coerceDriverId(driverId: unknown): number | null {
    if (typeof driverId === 'number' && Number.isFinite(driverId)) {
        return driverId;
    }
    if (typeof driverId === 'string' && /^\d+$/.test(driverId)) {
        return Number.parseInt(driverId, 10);
    }
    return null;
}

/**
 * Resolve a ruling's best available driver name. Precedence:
 *   1. Explicit `driver_name` on the ruling
 *   2. League roster lookup by `driver_id` (iRacing cust_id)
 *   3. Discord user id
 *   4. `Driver <id>` placeholder
 *   5. "Unknown"
 */
export function resolveRulingDriverName(
    r: StewardRuling,
    nameMap: DriverNameMap
): string {
    if (r.driver_name) return r.driver_name;
    const id = coerceDriverId(r.driver_id);
    if (id != null && nameMap[id]) {
        return nameMap[id];
    }
    if (r.discord_user_id) return r.discord_user_id;
    if (r.driver_id != null) return `Driver ${r.driver_id}`;
    return 'Unknown';
}

/**
 * Resolve a stable per-driver key. Prefers `discord_user_id` and falls
 * back to `driver_id`. Used for grouping in the standings table.
 */
function rulingDriverKey(r: StewardRuling): string {
    if (r.discord_user_id) return `d:${r.discord_user_id}`;
    if (r.driver_id != null) return `i:${r.driver_id}`;
    return 'unknown';
}

/**
 * Sum the championship-point-deduction sanctions on a single ruling.
 * The sanction array is open-ended — only entries whose `type` matches
 * the deduction key are summed.
 */
export function championshipPointsDeducted(r: StewardRuling): number {
    if (!r.sanctions) return 0;
    let total = 0;
    for (const s of r.sanctions) {
        if (s.type === 'championship_point_deduction' && s.value) {
            total += s.value;
        }
    }
    return total;
}

/**
 * Aggregate a list of rulings into per-driver license standings,
 * sorted by total license points descending. A `driverNameMap`
 * (iRacing cust_id → display name) supplies real names for rulings
 * that only carry `driver_id`.
 */
export function computeDriverStandings(
    rulings: StewardRuling[],
    driverNameMap: DriverNameMap = {}
): DriverLicenseStanding[] {
    const map = new Map<string, DriverLicenseStanding>();

    for (const r of rulings) {
        const key = rulingDriverKey(r);
        let entry = map.get(key);
        if (!entry) {
            entry = {
                key,
                discordUserId: r.discord_user_id,
                driverId: r.driver_id,
                driverName: resolveRulingDriverName(r, driverNameMap),
                totalLicensePoints: 0,
                totalRulings: 0,
                totalChampionshipPointDeduction: 0,
            };
            map.set(key, entry);
        }
        entry.totalLicensePoints += r.license_points || 0;
        entry.totalRulings += 1;
        entry.totalChampionshipPointDeduction += championshipPointsDeducted(r);
        // Upgrade the name if a later ruling has a better source
        // (e.g. the first ruling had only driver_id but a later one
        // carries an explicit driver_name from the backend).
        const resolved = resolveRulingDriverName(r, driverNameMap);
        if (
            r.driver_name &&
            entry.driverName !== r.driver_name &&
            resolved === r.driver_name
        ) {
            entry.driverName = r.driver_name;
        }
    }

    return Array.from(map.values()).sort(
        (a, b) => b.totalLicensePoints - a.totalLicensePoints
    );
}

/**
 * Parse an ISO-8601 ruling date string sent by the backend.
 *
 * The backend always sends rulings in UTC, but per the ECMAScript spec
 * an ISO string with a time component and no timezone marker
 * (e.g. "2026-01-01T12:00:00") is interpreted as **local time**, not
 * UTC. Some backends also use a space separator instead of `T`
 * ("2026-01-01 12:00:00"), which V8 accepts but again parses as local
 * time. To avoid silently offsetting every displayed time by the
 * user's UTC offset we normalise both cases to an explicit UTC
 * timestamp before handing the string to `new Date()`.
 *
 * Returns null for empty input or strings that can't be parsed.
 */
// Only log the first handful of distinct raw inputs so diagnostics
// don't spam the console when a page has many rulings.
const _rulingDateSamples = new Set<string>();
const _MAX_RULING_DATE_SAMPLES = 5;

export function parseRulingDate(iso: string | null | undefined): Date | null {
    if (iso == null) return null;
    const raw = typeof iso === 'string' ? iso : String(iso);
    let trimmed = raw.trim();
    if (!trimmed) return null;

    // Normalise "YYYY-MM-DD HH:MM:SS" → "YYYY-MM-DDTHH:MM:SS" so the
    // downstream regex/suffix logic treats it like a standard ISO
    // date+time string.
    const spaceSepMatch = /^(\d{4}-\d{2}-\d{2}) (\d{2}(?::\d{2})?(?::\d{2})?)/;
    if (spaceSepMatch.test(trimmed)) {
        trimmed = trimmed.replace(' ', 'T');
    }

    // Look for an explicit UTC marker or a numeric offset at the end.
    const hasTimezone = /(Z|[+-]\d{2}:?\d{2})$/.test(trimmed);
    // Date-only strings ("2026-01-01") are already UTC per the ES spec;
    // only date+time strings need the UTC suffix applied.
    const needsUtcSuffix = !hasTimezone && trimmed.includes('T');
    const normalized = needsUtcSuffix ? trimmed + 'Z' : trimmed;
    const d = new Date(normalized);

    if (
        !import.meta.server &&
        _rulingDateSamples.size < _MAX_RULING_DATE_SAMPLES
    ) {
        const key = `${raw}→${normalized}`;
        if (!_rulingDateSamples.has(key)) {
            _rulingDateSamples.add(key);
            console.log(
                `[STWD-DIAG] parseRulingDate raw=${JSON.stringify(raw)} ` +
                    `normalized=${JSON.stringify(normalized)} ` +
                    `iso=${isNaN(d.getTime()) ? 'INVALID' : d.toISOString()}`
            );
        }
    }

    return isNaN(d.getTime()) ? null : d;
}

/**
 * Sort rulings by date descending (most recent first). Returns a new
 * array; the input is not mutated.
 */
export function sortRulingsByDateDesc(
    rulings: StewardRuling[]
): StewardRuling[] {
    return [...rulings].sort((a, b) => {
        const ta = parseRulingDate(a.ruling_date)?.getTime() || 0;
        const tb = parseRulingDate(b.ruling_date)?.getTime() || 0;
        return tb - ta;
    });
}

/**
 * Build a cust_id → display name map from a league roster response.
 * Exported for use by other steward views that need to resolve names
 * without re-running the full model.
 *
 * Coerces string cust_ids to numbers so the map lookup still works
 * when the backend happens to serialise iRacing customer ids as
 * numeric strings.
 */
export function buildDriverNameMapFromRoster(
    roster:
        | { cust_id: number | string; display_name: string }[]
        | null
        | undefined
): DriverNameMap {
    const ret: DriverNameMap = {};
    if (!roster) return ret;
    for (const m of roster) {
        if (!m || !m.display_name) continue;
        const raw = m.cust_id as unknown;
        let id: number | null = null;
        if (typeof raw === 'number' && Number.isFinite(raw)) {
            id = raw;
        } else if (typeof raw === 'string' && /^\d+$/.test(raw)) {
            id = Number.parseInt(raw, 10);
        }
        if (id != null) {
            ret[id] = m.display_name;
        }
    }
    return ret;
}

/**
 * Describe the shape of a value for diagnostic logging. Safe against
 * circular references and huge payloads.
 */
function _describeShape(v: unknown): string {
    if (v === null) return 'null';
    if (v === undefined) return 'undefined';
    const t = typeof v;
    if (t !== 'object') return t;
    if (Array.isArray(v)) return `array(${v.length})`;
    return 'object';
}

export async function getStewardRulingsModel(
    league: string,
    season: string
): Promise<StewardRulingsModel> {
    const ret = getDefaultStewardRulingsModel();
    if (!league || !season) return ret;

    // Fetch rulings and the league roster in parallel. Missing roster
    // is not fatal — standings and the ledger still render with
    // fallback identifiers.
    const [rulings, rosterDoc] = await Promise.all([
        getRulings(league, season),
        getLeagueRoster(league),
    ]);

    if (!import.meta.server) {
        console.log('[STWD-DIAG] getStewardRulingsModel fetched', {
            league,
            season,
            rulings: _describeShape(rulings),
            rosterDoc: _describeShape(rosterDoc),
            rosterEntries: _describeShape(
                (rosterDoc as { roster?: unknown } | null)?.roster
            ),
        });

        const rosterArr = (rosterDoc as { roster?: unknown[] } | null)?.roster;
        if (Array.isArray(rosterArr) && rosterArr.length > 0) {
            const sample = rosterArr[0] as Record<string, unknown>;
            console.log('[STWD-DIAG] roster[0] sample', {
                keys: Object.keys(sample || {}),
                cust_id: sample?.cust_id,
                cust_id_type: typeof sample?.cust_id,
                display_name: sample?.display_name,
            });
        }

        if (Array.isArray(rulings) && rulings.length > 0) {
            const sample = rulings[0] as Record<string, unknown>;
            console.log('[STWD-DIAG] rulings[0] sample', {
                keys: Object.keys(sample || {}),
                ruling_date: sample?.ruling_date,
                ruling_date_type: typeof sample?.ruling_date,
                driver_id: sample?.driver_id,
                driver_id_type: typeof sample?.driver_id,
                discord_user_id: sample?.discord_user_id,
                driver_name: sample?.driver_name,
            });
        }
    }

    if (!rulings || !Array.isArray(rulings)) return ret;

    ret.driverNameMap = buildDriverNameMapFromRoster(
        (
            rosterDoc as {
                roster?: { cust_id: number; display_name: string }[];
            } | null
        )?.roster
    );

    if (!import.meta.server) {
        const mapKeys = Object.keys(ret.driverNameMap);
        console.log('[STWD-DIAG] built driverNameMap', {
            size: mapKeys.length,
            firstKeys: mapKeys.slice(0, 3),
        });

        // Flag rulings that have a driver_id but couldn't be resolved
        // against the roster. This is the signal we're after for the
        // "displayed as a number" bug — it tells us whether the
        // backend sent a driver_id we don't have a roster entry for,
        // a driver_id in an unexpected type, or something else.
        const unresolved: {
            driver_id: unknown;
            driver_id_type: string;
            discord_user_id: unknown;
            in_map: boolean;
        }[] = [];
        for (const r of rulings) {
            if (r.driver_name) continue;
            if (r.driver_id == null) continue;
            const id = coerceDriverId(r.driver_id);
            const inMap = id != null && !!ret.driverNameMap[id];
            if (!inMap) {
                unresolved.push({
                    driver_id: r.driver_id,
                    driver_id_type: typeof r.driver_id,
                    discord_user_id: r.discord_user_id,
                    in_map: inMap,
                });
            }
        }
        if (unresolved.length > 0) {
            console.warn(
                `[STWD-DIAG] ${unresolved.length} ruling(s) have driver_id but no roster match`,
                unresolved.slice(0, 5)
            );
        }
    }

    ret.rulings = sortRulingsByDateDesc(rulings);
    ret.standings = computeDriverStandings(rulings, ret.driverNameMap);
    return ret;
}
