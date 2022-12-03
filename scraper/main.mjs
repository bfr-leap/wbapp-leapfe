import { clientGet, auth } from './iracing-client.mjs';
(async () => {
    const username = process.env.IWP_USERNAME || 'test';
    const password = process.env.IWP_PASSWORD || 'test';
    await auth(username, password);

    // const resp = await clientGet('/data/results/lap_chart_data', {
    //     subsession_id: 52396226,
    //     simsession_number: 0,
    // });

    // const resp = await clientGet('/data/league/directory', {
    //     restrict_to_member: true,
    // });

    // const resp = await clientGet('/data/league/seasons', {
    //     league_id: 6555,
    //     retired: false,
    // });

    const resp = await clientGet('/data/league/season_sessions', {
        league_id: 6555,
        season_id: 80139,
        retired: false,
    });

    console.log(JSON.stringify(resp, null, '    '));
})();
