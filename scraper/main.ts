import { auth } from './iracing-client.js';

import { scrapeLeague } from './iracing-scraper.js';

(async () => {
    const username = process.env.IWP_USERNAME || 'test';
    const password = process.env.IWP_PASSWORD || 'test';
    await auth(username, password);

    scrapeLeague(6555);
})();
