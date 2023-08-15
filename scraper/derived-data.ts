/**
 *
 * The given code imports various functions related to deriving information from simulated racing league
 * sessions and telemetry data. These functions are used to process data such as session indexes, session
 * results, driver statistics, member and track information, and lap telemetry for different racing leagues.
 * The deriveLeague function is then invoked multiple times with specific league IDs to execute the data
 * processing operations for those leagues.
 *
 */

import { deriveLeagueSimSessionIndex } from './derive/league-sim-session-index.js';
import { deriveLeagueSimSessionResults } from './derive/league-sim-session-results.js';
import { deriveDriverStats } from './derive/driver-stats.js';
import { deriveSingleMemberInfo } from './derive/single-member-info.js';
import { deriveSingleTrackInfo } from './derive/single-track-info.js';
import { deriveTrackInfoDirectory } from './derive/track-info-directory.js';
import { deriveLeagueLapTelemetry } from './derive/lap-telemetry.js';

function deriveLeague(leagueId: number) {
    deriveLeagueSimSessionIndex(leagueId);
    deriveLeagueSimSessionResults(leagueId);
    deriveDriverStats(leagueId);
    deriveSingleMemberInfo(leagueId);
    deriveSingleTrackInfo(leagueId);
    deriveTrackInfoDirectory(leagueId);
    deriveLeagueLapTelemetry(leagueId);
}

deriveLeague(6555);
deriveLeague(637);
deriveLeague(5567);
