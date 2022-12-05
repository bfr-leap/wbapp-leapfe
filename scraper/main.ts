import { auth } from './iracing-client.js';
import {
    getLeagueDirectory,
    getLeagueSeasons,
    getLeagueSeasonSessions,
    getLapChartData,
} from './iracing-endpoint-client.js';

import { scrapeLeague } from './iracing-scraper.js';

(async () => {
    const username = process.env.IWP_USERNAME || 'test';
    const password = process.env.IWP_PASSWORD || 'test';
    await auth(username, password);

    // const resp = await getLapChartData(52396226, 0);
    // const resp = await getLeagueDirectory(true);
    // const resp = await getLeagueSeasons(6555, false); // this is the iFL league
    // const resp = await getLeagueSeasonSessions(6555, 80139, false);

    // console.log(JSON.stringify(resp, null, '    '));

    scrapeLeague(6555);
})();
