/**
 *
 * The provided code is an asynchronous JavaScript script that imports functions from two different
 * modules, 'iracing-client.js' and 'iracing-scraper.js'. It employs these imported functions to perform
 * tasks related to iRacing data scraping and authentication. The script first authenticates the user with
 * a provided username and password (or default values), and subsequently initiates the scraping of league
 * information for three different league IDs: 6555, 637, and 5567.
 *
 */

import { auth } from './iracing-client.js';

import {
    scrapeLeague,
    scrapeMembersData,
    getEncounteredCustIds,
    scrapeLapChartData,
} from './iracing-scraper.js';

(async () => {
    const username = process.env.IWP_USERNAME || 'test';
    const password = process.env.IWP_PASSWORD || 'test';
    await auth(username, password);

    await scrapeLeague(6555); // temporary with no access
    await scrapeLeague(637);
    await scrapeLeague(5567);
})();
