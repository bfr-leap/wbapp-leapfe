import {
    getDriverStandingsModel,
    type DriverModel,
} from '@@/src/models/driver/driver-standings-model';
import { getIrLinkState } from '@@/src/services/user-service';

export function pickProtagonist(
    drivers: DriverModel[],
    irCustId: string
): DriverModel | null {
    if (drivers.length === 0) return null;
    if (irCustId) {
        const mine = drivers.find((d) => d.custId === irCustId);
        if (mine) return mine;
    }
    return drivers[0] ?? null;
}

export async function safeIrCustId(): Promise<string> {
    try {
        const s = await getIrLinkState();
        return s?.irCustId || '';
    } catch {
        return '';
    }
}

export async function resolveProtagonistCustId(
    league: string,
    season: string,
    isSignedIn: boolean
): Promise<string> {
    if (!league || !season) return '';
    const standings = await getDriverStandingsModel(league, season, false);
    if (!standings.drivers.length) return '';
    const irCustId = isSignedIn ? await safeIrCustId() : '';
    const pick = pickProtagonist(standings.drivers, irCustId);
    return pick?.custId || '';
}
