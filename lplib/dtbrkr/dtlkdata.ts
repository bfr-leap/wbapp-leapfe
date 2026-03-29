function ldArg(arg: string | number | undefined): string {
    return arg ? '/' + arg : '';
}

function nNums(n: any): string {
    return n.toString().replace('-', 'n');
}

export async function getDocument(query: {
    [name: string]: string | number;
}): Promise<any> {
    const url = `https://arturo-mayorga.github.io/irl_stats/dist/data/${
        query.namespace + '/'
    }${query.type}${ldArg(query.league)}${ldArg(query.season)}${ldArg(
        query.subsession
    )}${nNums(ldArg(query.simsession))}${ldArg(query.driver)}${ldArg(
        query.car
    )}${ldArg(query.track)}${ldArg(query.sessionType)}${ldArg(
        query.custId
    )}.json`;

    console.log(`:: fetch: ${url}`);

    try {
        let objs = await fetch(url);
        let obj = await objs.json();

        if (query.type === 'leagueSimsessionIndex') {
            let seasons = Array.isArray(obj) ? obj : [];
            console.log(
                `[DEBUG:dtlkdata] leagueSimsessionIndex league=${query.league}:`,
                JSON.stringify(
                    seasons.map((s: any) => ({
                        season_id: s.season_id,
                        sessionCount: s.sessions?.length ?? 0,
                        subsession_ids: (s.sessions || []).map(
                            (ss: any) => ss.subsession_id
                        ),
                    }))
                )
            );
        }

        if (query.type === 'leagueSeasonSessions') {
            let sessions = obj?.sessions || [];
            console.log(
                `[DEBUG:dtlkdata] leagueSeasonSessions league=${query.league} season=${query.season}:`,
                JSON.stringify({
                    sessionCount: sessions.length,
                    sessions: sessions.map((s: any) => ({
                        subsession_id: s.subsession_id,
                        session_id: s.session_id,
                        track: s.track,
                        launch_at: s.launch_at,
                    })),
                })
            );
        }

        return obj;
    } catch (e) {
        return null;
    }
}
