import {
    LapChartData,
    LeagueSeasons,
    LeagueSeasonSessions,
    LSS_Session,
    LS_SeasonSummary,
    SeasonSimsessionIndex,
    SimsessionResults,
    SSI_Session,
    SSI_Simsession,
} from '../src/iracing-endpoints';
import {
    getLapChartData,
    getLeagueSeasons,
    getLeagueSeasonSessions,
} from './iracing-scraped-data-loader.js';

import {
    calculateQualifyResults,
    calculateRaceResults,
} from './results-utils.js';

import { writeFileSync } from 'fs';

function wf(obj: any, name: string) {
    writeFileSync(`./dist/data/derived/${name}`, JSON.stringify(obj));
}

type LapChartDataVisitor = (
    leagueSeasons: LeagueSeasons,
    seasonInfo: LS_SeasonSummary,
    leaguSeasonSessions: LeagueSeasonSessions,
    sessionInfo: LSS_Session,
    lapChartData: LapChartData
) => void;
function acceptLapChartDataVisitor(
    leagueId: number,
    visitor: LapChartDataVisitor
) {
    let leagueSeasons = getLeagueSeasons(leagueId);

    for (let seasonInfo of leagueSeasons.seasons) {
        seasonInfo.season_id;

        try {
            let leaguSeasonSessions = getLeagueSeasonSessions(
                leagueId,
                seasonInfo.season_id
            );

            for (let sessionInfo of leaguSeasonSessions.sessions) {
                sessionInfo.subsession_id;
                let simSessionRetry = 8;

                for (let i = 0; i < simSessionRetry; ++i) {
                    try {
                        let lapChartData = getLapChartData(
                            sessionInfo.subsession_id,
                            -1 * i
                        );

                        visitor(
                            leagueSeasons,
                            seasonInfo,
                            leaguSeasonSessions,
                            sessionInfo,
                            lapChartData
                        );
                    } catch (e) {}
                }
            }
        } catch (e) {
            console.log(
                `error fetching info for season [${seasonInfo.season_name}: ${seasonInfo.season_id}] continuing to next season`
            );
        }
    }
}

function deriveLeagueSimSessionResults(leagueId: number) {
    acceptLapChartDataVisitor(
        leagueId,
        (
            leagueSeasons: LeagueSeasons,
            seasonInfo: LS_SeasonSummary,
            leaguSeasonSessions: LeagueSeasonSessions,
            sessionInfo: LSS_Session,
            lapChartData: LapChartData
        ) => {
            let r: SimsessionResults;
            if (lapChartData.session_info.simsession_type === 6) {
                r = calculateRaceResults(lapChartData);
            } else {
                r = calculateQualifyResults(lapChartData);
            }

            wf(
                r,
                `simSessionResults_${lapChartData.session_info.subsession_id}_${lapChartData.session_info.simsession_number}.json`
            );
        }
    );
}

function deriveLeagueSimSessionIndex(leagueId: number) {
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

                            if (lapCount < 10) {
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

//deriveLeagueSimSessionIndex(6555);
deriveLeagueSimSessionResults(6555);
