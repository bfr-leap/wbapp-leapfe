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

export interface StewardRulingsModel {
    rulings: StewardRuling[];
    standings: DriverLicenseStanding[];
}

export function getDefaultStewardRulingsModel(): StewardRulingsModel {
    return { rulings: [], standings: [] };
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
 * sorted by total license points descending.
 */
export function computeDriverStandings(
    rulings: StewardRuling[]
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
                driverName:
                    r.driver_name ||
                    r.discord_user_id ||
                    (r.driver_id != null ? `Driver ${r.driver_id}` : 'Unknown'),
                totalLicensePoints: 0,
                totalRulings: 0,
                totalChampionshipPointDeduction: 0,
            };
            map.set(key, entry);
        }
        entry.totalLicensePoints += r.license_points || 0;
        entry.totalRulings += 1;
        entry.totalChampionshipPointDeduction += championshipPointsDeducted(r);
        // Prefer a real driver_name when later rulings carry one.
        if (r.driver_name && entry.driverName !== r.driver_name) {
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

export async function getStewardRulingsModel(
    league: string,
    season: string
): Promise<StewardRulingsModel> {
    const ret = getDefaultStewardRulingsModel();
    if (!league || !season) return ret;

    const rulings = await getRulings(league, season);
    if (!rulings || !Array.isArray(rulings)) return ret;

    ret.rulings = sortRulingsByDateDesc(rulings);
    ret.standings = computeDriverStandings(rulings);
    return ret;
}
