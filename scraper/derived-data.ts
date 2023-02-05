import { deriveLeagueSimSessionIndex } from './derive/league-sim-session-index.js';
import { deriveLeagueSimSessionResults } from './derive/league-sim-session-results.js';
import { deriveDriverStats } from './derive/driver-stats.js';
import { deriveSingleMemberInfo } from './derive/single-member-info.js';
import { deriveSingleTrackInfo } from './derive/single-track-info.js';
import { deriveTrackInfoDirectory } from './derive/track-info-directory.js';

import { deriveLapTelemetry } from './derive/lap-telemetry.js';

// deriveLeagueSimSessionIndex(6555);
// deriveLeagueSimSessionResults(6555);
// deriveDriverStats(6555);
// deriveSingleMemberInfo(6555);
// deriveSingleTrackInfo(6555);
// deriveTrackInfoDirectory(6555);

deriveLapTelemetry(59522192);
