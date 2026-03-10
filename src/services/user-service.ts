/**
 * User service — user state, features, and iRacing account linking.
 */

import { fetchUncached, prepUrl } from '@@/src/utils/api-client';
import type {
    UserLeaguesState,
    UserFeatures,
} from '@@/lplib/endpoint-types/usrdata';

// ---------------------------------------------------------------------------
// iRacing link
// ---------------------------------------------------------------------------

export interface IrLinkState {
    isVerified: boolean;
    irCustId: string;
    msgSent: boolean;
}

export async function getIrLinkState(): Promise<IrLinkState> {
    const namespace = 'ldata-usrdata';
    const type = 'irLinkState';
    return await fetchUncached({ namespace, type });
}

export async function setIrLinkDriver(
    driver: string
): Promise<Record<string, unknown>> {
    const namespace = 'ldata-usrdata';
    const type = 'irLinkDriverUpd';
    return await fetchUncached({ namespace, type, driver });
}

export async function setIrLinkCode(
    code: number
): Promise<Record<string, unknown>> {
    const namespace = 'ldata-usrdata';
    const type = 'irLinkCodeUpd';
    return await fetchUncached({ namespace, type, code });
}

// ---------------------------------------------------------------------------
// User leagues state (with short-lived cache)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _userLeagueStateCache: Promise<any> | null = null;
let _userLeagueStateTimer: ReturnType<typeof setTimeout> | null = null;
let _userLeagueStateTimeout = 1500;

export async function getUserLeaguesState(): Promise<UserLeaguesState> {
    const namespace = 'ldata-usrdata';
    const type = 'userLeagues';

    if (_userLeagueStateTimer) {
        clearTimeout(_userLeagueStateTimer);
        _userLeagueStateTimer = null;
    }

    _userLeagueStateTimer = setTimeout(() => {
        _userLeagueStateCache = null;
    }, _userLeagueStateTimeout);

    if (!_userLeagueStateCache) {
        _userLeagueStateCache = fetchUncached({ namespace, type });
    }

    return await _userLeagueStateCache;
}

export async function setUserLeaguesState(
    leagueIDList: number[]
): Promise<UserLeaguesState> {
    const namespace = 'ldata-usrdata';
    const type = 'userLeaguesUpd';
    let code = leagueIDList.join('-');
    return await fetchUncached({ namespace, type, code });
}

// ---------------------------------------------------------------------------
// User features (with long-lived cache)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _userFeaturesCache: Promise<any> | null = null;
let _userFeaturesTimer: ReturnType<typeof setTimeout> | null = null;
let _userFeaturesTimeout = 1000 * 60 * 60;

export async function getUserFeatures(): Promise<UserFeatures> {
    const namespace = 'ldata-usrdata';
    const type = 'userFeatures';

    if (_userFeaturesTimer) {
        clearTimeout(_userFeaturesTimer);
        _userFeaturesTimer = null;
    }

    _userFeaturesTimer = setTimeout(() => {
        _userFeaturesCache = null;
    }, _userFeaturesTimeout);

    if (!_userFeaturesCache) {
        _userFeaturesCache = fetchUncached({ namespace, type });
    }

    return await _userFeaturesCache;
}
