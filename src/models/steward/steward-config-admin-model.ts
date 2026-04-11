/**
 * Steward configuration admin model — read/save the per-league
 * race-control Discord channel id.
 */

import {
    getStewardConfig,
    updStewardConfig,
} from '@@/src/services/steward-service';

export interface StewardConfigAdminModel {
    raceControlChannelId: string;
    loaded: boolean;
}

export function getDefaultStewardConfigAdminModel(): StewardConfigAdminModel {
    return { raceControlChannelId: '', loaded: false };
}

export async function getStewardConfigAdminModel(
    league: string
): Promise<StewardConfigAdminModel> {
    const ret = getDefaultStewardConfigAdminModel();
    if (!league) return ret;

    const cfg = await getStewardConfig(league);
    if (cfg && typeof cfg.race_control_channel_id === 'string') {
        ret.raceControlChannelId = cfg.race_control_channel_id;
    }
    ret.loaded = true;
    return ret;
}

export interface SaveStewardConfigResult {
    ok: boolean;
    message: string;
}

export async function saveStewardConfig(
    league: string,
    raceControlChannelId: string
): Promise<SaveStewardConfigResult> {
    const result = await updStewardConfig(league, raceControlChannelId);

    if (result?._error) {
        console.error(
            `[STWD-ADMIN] saveStewardConfig server error:`,
            result._source,
            result._message,
            result._url,
            result._baseUrl
        );
        return {
            ok: false,
            message: result._message || 'Failed to save steward configuration.',
        };
    }

    return { ok: true, message: 'Steward configuration saved.' };
}
