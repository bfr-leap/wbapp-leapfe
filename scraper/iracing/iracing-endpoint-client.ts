/**
 *
 * This TypeScript module contains functions to interact with the iRacing API for retrieving various data
 * related to leagues and racing sessions. It includes functions to fetch league directories, league
 * seasons, season sessions, lap chart data, and member information. The functions use the provided
 * parameters to make API requests and return the corresponding data structures as promises.
 *
 */

import { clientGet, auth } from './iracing-client.js';
import type {
    LeagueDirectory,
    LeagueSeasons,
    LeagueSeasonSessions,
    LapChartData,
    MembersData,
} from 'ir-endpoints-types';

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
    // console.log('getting lap data from endpoint');
    let ret: LapChartData = <LapChartData>(
        await clientGet('/data/results/lap_chart_data', {
            subsession_id: subsessionId,
            simsession_number: simsessionNumber,
        })
    );

    return ret;
}

export async function getMembers(custIds: number[]): Promise<MembersData> {
    let ret: MembersData = <MembersData>await clientGet('/data/member/get', {
        cust_ids: custIds.join(','),
        include_licenses: true,
    });

    return ret;
}
