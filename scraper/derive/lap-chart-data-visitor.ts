import {
    LapChartData,
    LeagueSeasons,
    LeagueSeasonSessions,
    LSS_Session,
    LS_SeasonSummary,
} from '../../src/iracing-endpoints.js';

import {
    getLeagueSeasons,
    getLeagueSeasonSessions,
    getLapChartData,
} from '../iracing-scraped-data-loader.js';

export type LapChartDataVisitor = (
    leagueSeasons: LeagueSeasons,
    seasonInfo: LS_SeasonSummary,
    leaguSeasonSessions: LeagueSeasonSessions,
    sessionInfo: LSS_Session,
    lapChartData: LapChartData
) => void;
export function acceptLapChartDataVisitor(
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
