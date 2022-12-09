import { auth } from './iracing-client.js';

import {
    scrapeLeague,
    scrapeMembersData,
    getEncounteredCustIds,
} from './iracing-scraper.js';

(async () => {
    const username = process.env.IWP_USERNAME || 'test';
    const password = process.env.IWP_PASSWORD || 'test';
    await auth(username, password);

    await scrapeLeague(6555);
})();
