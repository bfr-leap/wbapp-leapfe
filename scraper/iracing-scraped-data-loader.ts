import { readFileSync } from 'fs';

import type {
    LeagueDirectory,
    LeagueSeasons,
    LeagueSeasonSessions,
    LapChartData,
    MembersData,
} from '../src/iracing-endpoints';

const MNT_PT = './dist/data/scraped/';

export function getLeagueDirectory(): LeagueDirectory {
    let ret: LeagueDirectory = <LeagueDirectory>JSON.parse(
        readFileSync(`${MNT_PT}leagueDirectory.json`, {
            encoding: 'utf8',
            flag: 'r',
        })
    );

    return ret;
}

export function getLeagueSeasons(leagueId: number): LeagueSeasons {
    let ret: LeagueSeasons = <LeagueSeasons>JSON.parse(
        readFileSync(`${MNT_PT}leagueSeasons_${leagueId}.json`, {
            encoding: 'utf8',
            flag: 'r',
        })
    );

    return ret;
}

export function getLeagueSeasonSessions(
    leagueId: number,
    seasonId: number
): LeagueSeasonSessions {
    let ret: LeagueSeasonSessions = <LeagueSeasonSessions>JSON.parse(
        readFileSync(
            `${MNT_PT}leagueSeasonSessions_${leagueId}_${seasonId}.json`,
            {
                encoding: 'utf8',
                flag: 'r',
            }
        )
    );

    return ret;
}

export function getLapChartData(
    subsessionId: number,
    simsessionNumber: number
): LapChartData {
    let ret: LapChartData = <LapChartData>JSON.parse(
        readFileSync(
            `${MNT_PT}lapChartData_${subsessionId}_${simsessionNumber}.json`,
            {
                encoding: 'utf8',
                flag: 'r',
            }
        )
    );

    return ret;
}

export function getMembersData(leagueId: number, seasonId: number): MembersData {
    let ret: MembersData = <MembersData>JSON.parse(
        readFileSync(
            `${MNT_PT}membersData_${leagueId}_${seasonId}.json`,
            {
                encoding: 'utf8',
                flag: 'r',
            }
        )
    );

    return ret;
}
