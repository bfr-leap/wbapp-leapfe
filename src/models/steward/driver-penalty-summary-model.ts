/**
 * Driver penalty summary model — totals and ruling history for a single
 * driver in a given league/season. Used by the driver profile page.
 */

import type { StewardRuling } from '@@/lplib/endpoint-types/iracing-endpoints';
import { getRulings } from '@@/src/services/steward-service';
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
 * Build the per-driver penalty summary. The app identifies drivers by
 * iRacing cust_id rather than Discord user id, so we fetch the
 * season-wide rulings list and filter client-side. The data broker
 * only exposes the season-wide rulings endpoint anyway.
 */
export async function getDriverPenaltySummaryModel(
    league: string,
    season: string,
    driver: string
): Promise<DriverPenaltySummaryModel> {
    if (!league || !season || !driver) {
        return getDefaultDriverPenaltySummaryModel();
    }

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
