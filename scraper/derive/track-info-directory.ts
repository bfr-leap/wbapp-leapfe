import {
    LeagueSeasons,
    LS_SeasonSummary,
    LeagueSeasonSessions,
    LSS_Session,
    LapChartData,
    TrackInfoDirectory,
} from '../../src/iracing-endpoints';
import { acceptLapChartDataVisitor } from './lap-chart-data-visitor.js';
import { wf } from './file-writer.js';

export function deriveTrackInfoDirectory(leagueId: number) {
    let trackInfoDirectory: TrackInfoDirectory = {
        league_name: '',
        track_display: {},
        car_display: {},
        car_2_track_map: {},
    };

    let trackMapByCar: { [name: string]: { [name: string]: boolean } } = {};
    acceptLapChartDataVisitor(
        leagueId,
        (
            leagueSeasons: LeagueSeasons,
            seasonInfo: LS_SeasonSummary,
            leaguSeasonSessions: LeagueSeasonSessions,
            sessionInfo: LSS_Session,
            lapChartData: LapChartData
        ) => {
            trackInfoDirectory.car_display[
                sessionInfo.cars[0].car_id.toString()
            ] = sessionInfo.cars[0].car_name;

            trackInfoDirectory.track_display[
                sessionInfo.track.track_id.toString()
            ] = sessionInfo.track.track_name;

            let trackMap = trackMapByCar[sessionInfo.cars[0].car_id];
            if (!trackMap) {
                trackMap = trackMapByCar[sessionInfo.cars[0].car_id] = {};
            }
            trackMap[sessionInfo.track.track_id] = true;
        }
    );

    let carIds = Object.keys(trackMapByCar);
    for (let cId of carIds) {
        let trackIds = Object.keys(trackMapByCar[cId]);
        trackInfoDirectory.car_2_track_map[cId] = trackIds;
    }

    trackInfoDirectory.league_name = 'iFormula League';

    wf(trackInfoDirectory, `trackInfoDirectory_${leagueId}.json`);
}
