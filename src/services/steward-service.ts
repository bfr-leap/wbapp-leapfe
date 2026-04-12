/**
 * Steward service — penalty rulings and steward configuration access.
 *
 * All data is fetched from wbsvc-dtbrkrrd via the `ldata-stwdcfg`
 * namespace. The frontend never reaches the data store directly.
 */

import { fetchCachedDocument, fetchUncached } from '@@/src/utils/api-client';
import type {
    StewardRuling,
    StewardConfig,
} from '@@/lplib/endpoint-types/iracing-endpoints';

/**
 * Fetch all steward rulings for a league/season. Sorted/filtered
 * client-side; results are cached.
 */
export async function getRulings(
    league: string,
    season: string
): Promise<StewardRuling[] | null> {
    const namespace = 'ldata-stwdcfg';
    const type = 'getRulings';
    return await fetchCachedDocument<StewardRuling[]>({
        namespace,
        type,
        league,
        season,
    });
}

/**
 * Fetch the steward configuration for a league. Cached because admins
 * may navigate away and back; the cache is small.
 */
export async function getStewardConfig(
    league: string
): Promise<StewardConfig | null> {
    const namespace = 'ldata-stwdcfg';
    const type = 'getStewardConfig';
    return await fetchCachedDocument<StewardConfig>({
        namespace,
        type,
        league,
    });
}

interface StewardConfigUpdateResult {
    success?: boolean;
    _error?: boolean;
    _source?: string;
    _message?: string;
    _url?: string;
    _baseUrl?: string;
    [key: string]: unknown;
}

/**
 * Update the race-control Discord channel id for a league.
 * Bypasses the cache because it is a mutation.
 */
export async function updStewardConfig(
    league: string,
    raceControlChannelId: string
): Promise<StewardConfigUpdateResult> {
    const namespace = 'ldata-stwdcfg';
    const type = 'updStewardConfig';
    return await fetchUncached<StewardConfigUpdateResult>({
        namespace,
        type,
        league,
        raceControlChannelId,
    });
}
