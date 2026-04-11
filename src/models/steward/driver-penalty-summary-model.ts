/**
 * Driver penalty summary model — totals and ruling history for a single
 * driver in a given league/season. Used by the driver profile page.
 */

import type { StewardRuling } from '@@/lplib/endpoint-types/iracing-endpoints';
import { getDriverRulings, getRulings } from '@@/src/services/steward-service';
import {
    championshipPointsDeducted,
    sortRulingsByDateDesc,
} from './steward-rulings-model';

export interface DriverPenaltySummaryModel {
    rulings: StewardRuling[];
    totalLicensePoints: number;
    totalRulings: number;
    totalChampionshipPointDeduction: number;
}

export function getDefaultDriverPenaltySummaryModel(): DriverPenaltySummaryModel {
    return {
        rulings: [],
        totalLicensePoints: 0,
        totalRulings: 0,
        totalChampionshipPointDeduction: 0,
    };
}

function summarise(rulings: StewardRuling[]): DriverPenaltySummaryModel {
    const ret = getDefaultDriverPenaltySummaryModel();
    ret.rulings = sortRulingsByDateDesc(rulings);
    ret.totalRulings = rulings.length;
    for (const r of rulings) {
        ret.totalLicensePoints += r.license_points || 0;
        ret.totalChampionshipPointDeduction += championshipPointsDeducted(r);
    }
    return ret;
}

/**
 * Build the per-driver penalty summary. Tries the driver-scoped endpoint
 * first; if the driver is identified by iRacing customer id rather than
 * Discord id, falls back to filtering the season-wide rulings list.
 */
export async function getDriverPenaltySummaryModel(
    league: string,
    season: string,
    driver: string
): Promise<DriverPenaltySummaryModel> {
    if (!league || !season || !driver) {
        return getDefaultDriverPenaltySummaryModel();
    }

    // The driver param on this app is an iRacing cust_id (numeric).
    // The rulings API keys drivers by Discord user id, so we always
    // filter the league/season rulings array client-side here.
    const rulings = await getRulings(league, season);
    if (!rulings || !Array.isArray(rulings)) {
        return getDefaultDriverPenaltySummaryModel();
    }

    const driverIdNum = Number.parseInt(driver, 10);
    const filtered = rulings.filter((r) => {
        if (Number.isFinite(driverIdNum) && r.driver_id === driverIdNum) {
            return true;
        }
        if (r.discord_user_id && r.discord_user_id === driver) {
            return true;
        }
        return false;
    });

    return summarise(filtered);
}

/**
 * Variant for callers that already know a driver's discord user id.
 * Uses the dedicated single-driver endpoint.
 */
export async function getDriverPenaltySummaryByDiscordId(
    league: string,
    season: string,
    discordUserId: string
): Promise<DriverPenaltySummaryModel> {
    if (!league || !season || !discordUserId) {
        return getDefaultDriverPenaltySummaryModel();
    }
    const rulings = await getDriverRulings(league, season, discordUserId);
    if (!rulings || !Array.isArray(rulings)) {
        return getDefaultDriverPenaltySummaryModel();
    }
    return summarise(rulings);
}
