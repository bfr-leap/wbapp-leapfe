import {
    SeasonSimsessionIndex,
    SSI_Session,
    SSI_Simsession,
} from '../../src/iracing-endpoints.js';
import {
    getLapChartData,
    getLeagueSeasons,
    getLeagueSeasonSessions,
} from '../iracing-scraped-data-loader.js';

import { wf } from './file-writer.js';
import { RACE_SPRINT_THRESHOLD } from './results-utils.js';

export function deriveLeagueSimSessionIndex(leagueId: number) {
    let ls = getLeagueSeasons(leagueId);

    let indices: SeasonSimsessionIndex[] = [];

    for (let s of ls.seasons) {
        s.season_id;

        let index: SeasonSimsessionIndex = {
            season_id: s.season_id,
            season_title: s.season_name,
            sessions: [],
        };

        indices.push(index);

        try {
            let lss = getLeagueSeasonSessions(leagueId, s.season_id);

            for (let se of lss.sessions) {
                se.subsession_id;
                let simSessionRetry = 8;

                let session: SSI_Session = {
                    session_id: se.session_id,
                    subsession_id: se.subsession_id,
                    session_title: `${se.track.track_name} - ${se.cars[0].car_name}`,
                    simsessions: [],
                };
                index.sessions.push(session);

                for (let i = 0; i < simSessionRetry; ++i) {
                    try {
                        let cd = getLapChartData(se.subsession_id, -1 * i);
                        let simtype = cd.session_info.simsession_type;
                        let simsession: SSI_Simsession = {
                            simsession_id: -1 * i,
                            type:
                                simtype === 6
                                    ? 'race'
                                    : simtype === 5
                                    ? 'qualify'
                                    : 'practice',
                        };

                        if (simsession.type === 'race') {
                            let lapCount = cd.chunk_info
                                .map((c) => c.lap_number)
                                .reduce((p, c) => Math.max(p, c), 0);

                            if (lapCount < RACE_SPRINT_THRESHOLD) {
                                simsession.type = 'sprint';
                            }
                        }

                        session.simsessions.push(simsession);
                    } catch (e) {}
                }
            }
        } catch (e) {
            console.log(
                `error fetching info for season [${s.season_name}: ${s.season_id}]`
            );
        }
    }

    wf(indices, `leagueSimsessionIndex_${leagueId}.json`);
}
