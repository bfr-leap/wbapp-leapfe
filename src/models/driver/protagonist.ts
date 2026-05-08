import {
    getDriverStandingsModel,
    type DriverModel,
} from '@@/src/models/driver/driver-standings-model';
import { getPastEventCardsModel } from '@@/src/models/event/past-events-cards-model';
import { getSimsessionResults } from '@@/src/utils/fetch-util';
import { getIrLinkState } from '@@/src/services/user-service';

export function pickProtagonist(
    drivers: DriverModel[],
    irCustId: string,
    fallbackCustId: string = ''
): DriverModel | null {
    if (drivers.length === 0) return null;
    if (irCustId) {
        const mine = drivers.find((d) => d.custId === irCustId);
        if (mine) return mine;
    }
    if (fallbackCustId) {
        const fallback = drivers.find((d) => d.custId === fallbackCustId);
        if (fallback) return fallback;
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

export async function getLatestRaceWinnerCustId(
    league: string,
    season: string
): Promise<string> {
    const past = await getPastEventCardsModel(league, season);
    const now = Date.now();
    const completed = past.pastRaces
        .filter(
            (r) =>
                r.date &&
                new Date(r.date).getTime() <= now &&
                r.sessionId &&
                r.simsessionId
        )
        .sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
    const latest = completed[0];
    if (!latest) return '';

    const sim = await getSimsessionResults(
        latest.sessionId,
        latest.simsessionId
    );
    const sorted = [...(sim?.results || [])].sort(
        (a, b) => a.position - b.position
    );
    const winner = sorted[0];
    return winner ? winner.cust_id.toString() : '';
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
    const userInField =
        irCustId && !!standings.drivers.find((d) => d.custId === irCustId);

    let fallbackCustId = '';
    if (!userInField) {
        fallbackCustId = await getLatestRaceWinnerCustId(league, season);
    }

    const pick = pickProtagonist(standings.drivers, irCustId, fallbackCustId);
    return pick?.custId || '';
}
