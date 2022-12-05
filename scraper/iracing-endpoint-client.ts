import { clientGet, auth } from './iracing-client.js';
import type {
    LeagueDirectory,
    LeagueSeasons,
    LeagueSeasonSessions,
    LapChartData,
} from '../src/iracing-endpoints';

export async function getLeagueDirectory(
    restrictToMember: boolean
): Promise<LeagueDirectory> {
    let ret: LeagueDirectory = <LeagueDirectory>(
        await clientGet('/data/league/directory', {
            restrict_to_member: restrictToMember,
        })
    );

    return ret;
}

export async function getLeagueSeasons(
    leagueId: number,
    retired: boolean
): Promise<LeagueSeasons> {
    let ret: LeagueSeasons = <LeagueSeasons>(
        await clientGet('/data/league/seasons', {
            league_id: leagueId,
            retired: retired,
        })
    );

    return ret;
}

export async function getLeagueSeasonSessions(
    leagueId: number,
    seasonId: number,
    retired: boolean
): Promise<LeagueSeasonSessions> {
    let ret: LeagueSeasonSessions = <LeagueSeasonSessions>(
        await clientGet('/data/league/season_sessions', {
            league_id: leagueId,
            season_id: seasonId,
            retired: retired,
        })
    );

    return ret;
}

export async function getLapChartData(
    subsessionId: number,
    simsessionNumber: number
): Promise<LapChartData> {
    let ret: LapChartData = <LapChartData>(
        await clientGet('/data/results/lap_chart_data', {
            subsession_id: subsessionId,
            simsession_number: simsessionNumber,
        })
    );

    return ret;
}
