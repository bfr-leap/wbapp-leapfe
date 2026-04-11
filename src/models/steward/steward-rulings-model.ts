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
    if (r.driver_id != null && nameMap[r.driver_id]) {
        return nameMap[r.driver_id];
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
 * Sort rulings by date descending (most recent first). Returns a new
 * array; the input is not mutated.
 */
export function sortRulingsByDateDesc(
    rulings: StewardRuling[]
): StewardRuling[] {
    return [...rulings].sort((a, b) => {
        const ta = Date.parse(a.ruling_date) || 0;
        const tb = Date.parse(b.ruling_date) || 0;
        return tb - ta;
    });
}

/**
 * Build a cust_id → display name map from a league roster response.
 * Exported for use by other steward views that need to resolve names
 * without re-running the full model.
 */
export function buildDriverNameMapFromRoster(
    roster: { cust_id: number; display_name: string }[] | null | undefined
): DriverNameMap {
    const ret: DriverNameMap = {};
    if (!roster) return ret;
    for (const m of roster) {
        if (m && typeof m.cust_id === 'number' && m.display_name) {
            ret[m.cust_id] = m.display_name;
        }
    }
    return ret;
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

    if (!rulings || !Array.isArray(rulings)) return ret;

    ret.driverNameMap = buildDriverNameMapFromRoster(rosterDoc?.roster);
    ret.rulings = sortRulingsByDateDesc(rulings);
    ret.standings = computeDriverStandings(rulings, ret.driverNameMap);
    return ret;
}
