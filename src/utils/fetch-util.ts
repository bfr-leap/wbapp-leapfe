/**
 * Backwards-compatible re-export barrel.
 *
 * All functions that previously lived in this 661-line file have been
 * split into focused modules:
 *
 *   src/utils/api-client.ts      — HTTP client, caching, auth
 *   src/services/league-service.ts   — league/season/team data
 *   src/services/results-service.ts  — race results, charts, telemetry
 *   src/services/user-service.ts     — user state & iRacing link
 *   src/services/admin-service.ts    — admin schedule operations
 *
 * Existing imports from '@@/src/utils/fetch-util' will continue to work.
 * New code should import from the specific module directly.
 */

// Core client
export {
    setApiBaseURL,
    setAuth,
    setToken,
    preFetch,
    fetchCachedDocument,
    clearCache,
} from './api-client';

// League service
export {
    getLeagueSeasons,
    getCuratedBlockedSeasons,
    getMembersData,
    getLeagueSimsessionIndex,
    getSeasonSimsessionIndex,
    getLeagueSeasonSessions,
    getTrackInfoDirectory,
    getCuratedLeagueTeamsInfo,
    getCuratedTrackDisplayInfo,
    getCuratedActiveLeagueSchedule,
    getLeagueRoster,
    defLgSeasSubCtx,
} from '@@/src/services/league-service';

// Results service
export {
    getSingleMemberData,
    getLeagueDriverStats,
    getDriverResults,
    getSimsessionResults,
    getTrackStats,
    getLapChartData,
    getGeneratedSimsessionSummary,
    getTelemetrySubsessionIds,
    getCumulativeDeltaBestLapChartData,
    getPacePercentVsIdealLapChartData,
    getPacePercentChartData,
    getStartFinishChartData,
    getCumulativeDeltaChartData,
} from '@@/src/services/results-service';

// User service
export {
    getIrLinkState,
    setIrLinkDriver,
    setIrLinkCode,
    getUserLeaguesState,
    setUserLeaguesState,
    getUserFeatures,
} from '@@/src/services/user-service';
export type { IrLinkState } from '@@/src/services/user-service';
export type {
    LeagueRoster,
    DefaultLeagueContext,
} from '@@/src/services/league-service';

// Admin service
export {
    crtSchedEvent,
    updSchedEvent,
    delSchedEvent,
} from '@@/src/services/admin-service';
