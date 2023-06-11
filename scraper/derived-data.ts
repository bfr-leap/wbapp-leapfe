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
