import {
    getLeagueDirectory,
    getLeagueSeasons,
    getLeagueSeasonSessions,
    getLapChartData,
    getMembers,
} from './iracing-endpoint-client.js';

import { writeFileSync } from 'fs';

function wf(obj: any, name: string) {
    writeFileSync(`./dist/data/scraped/${name}`, JSON.stringify(obj));
}

export async function scrapeLeague(leagueId: number) {
    console.log('scrapeLeague: ', leagueId);
    const seasons = await getLeagueSeasons(leagueId, true);
    wf(seasons, `leagueSeasons_${leagueId}.json`);

    for (let season of seasons.seasons) {
        resetEncounteredCustIds();
        if (season.season_name.toLocaleLowerCase().indexOf('practice') === -1) {
            await scrapeLeagueSeasonSessions(leagueId, season.season_id, false);
            await scrapeMembersData(
                getEncounteredCustIds(),
                leagueId,
                season.season_id
            );
        }
    }
}

export async function scrapeLeagueSeasonSessions(
    leagueId: number,
    seasonId: number,
    retired: boolean
) {
    console.log('    scrapeLeagueSeasons: ', leagueId, seasonId);
    const sessions = await getLeagueSeasonSessions(leagueId, seasonId, retired);
    wf(sessions, `leagueSeasonSessions_${leagueId}_${seasonId}.json`);

    for (let sub of sessions.sessions) {
        await scrapeLapChartData(sub.subsession_id, 0);
        await scrapeLapChartData(sub.subsession_id, -1);
        await scrapeLapChartData(sub.subsession_id, -2);
        await scrapeLapChartData(sub.subsession_id, -3);
        await scrapeLapChartData(sub.subsession_id, -4);
        await scrapeLapChartData(sub.subsession_id, -5);
        await scrapeLapChartData(sub.subsession_id, -6);
    }
}

export async function scrapeLapChartData(
    subsessionId: number,
    simsessionNumber: number
) {
    try {
        console.log(
            '        scrapeLapChartData: ',
            subsessionId,
            simsessionNumber
        );
        const chartData = await getLapChartData(subsessionId, simsessionNumber);
        wf(chartData, `lapChartData_${subsessionId}_${simsessionNumber}.json`);

        for (let c of chartData.chunk_info) {
            _encounteredCustIds[c.cust_id] = c.cust_id;
        }
    } catch (e) {
        console.log(
            '            error on scrapeLapChartData: ',
            subsessionId,
            simsessionNumber,
            'continuing'
        );
    }
}

let _encounteredCustIds: { [name: number]: number } = {};
export function resetEncounteredCustIds() {
    _encounteredCustIds = {};
}

export function getEncounteredCustIds(): number[] {
    return Object.keys(_encounteredCustIds).map((s) => Number.parseInt(s, 10));
}

export async function scrapeMembersData(
    custIds: number[],
    leagueId: number,
    seasonId: number
) {
    console.log('scrapeMembersData: ', custIds.length);
    const memData = await getMembers(custIds);
    wf(memData, `membersData_${leagueId}_${seasonId}.json`);
}
