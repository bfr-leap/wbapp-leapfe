import {
    getLeagueRoster,
    getLeagueSeasons,
    getMembersData,
} from '@/utils/fetch-util';

export type LeagueRosterModel = any;

export function getDefaultRosterModel(): LeagueRosterModel {
    return JSON.parse(
        JSON.stringify({
            rows: [],
            leagueId: 0,
            season: 0,
            title: 'League Driver Roster',
        })
    );
}

export async function getRosterModel(
    league: string
): Promise<LeagueRosterModel> {
    let ret = getDefaultRosterModel();

    const roster = await getLeagueRoster(league);
    const leagueSeasons = await getLeagueSeasons(league);

    const seasons = leagueSeasons?.seasons.sort(
        (a, b) => b.season_id - a.season_id
    );

    const mebersS1 =
        (
            await getMembersData(
                league,
                seasons?.[0].season_id?.toString() || ''
            )
        )?.members.map((m) => m.cust_id) || [];
    const mebersS2 =
        (
            await getMembersData(
                league,
                seasons?.[1].season_id?.toString() || ''
            )
        )?.members.map((m) => m.cust_id) || [];
    const mebersS3 =
        (
            await getMembersData(
                league,
                seasons?.[2].season_id?.toString() || ''
            )
        )?.members.map((m) => m.cust_id) || [];
    const mebersS4 =
        (
            await getMembersData(
                league,
                seasons?.[3].season_id?.toString() || ''
            )
        )?.members.map((m) => m.cust_id) || [];
    const mebersS5 =
        (
            await getMembersData(
                league,
                seasons?.[4].season_id?.toString() || ''
            )
        )?.members.map((m) => m.cust_id) || [];

    const fRoster = (
        roster?.roster
            ?.map((m: any) => {
                return {
                    cust_id: m.cust_id,
                    car_number: m.car_number,
                    name: m.display_name,
                    code:
                        mebersS1.indexOf(m.cust_id) >= 0
                            ? 1
                            : mebersS2.indexOf(m.cust_id) >= 0
                            ? 2
                            : mebersS3.indexOf(m.cust_id) >= 0
                            ? 3
                            : mebersS4.indexOf(m.cust_id) >= 0
                            ? 4
                            : mebersS5.indexOf(m.cust_id) >= 0
                            ? 5
                            : 99,
                };
            })
            .sort((a: any, b: any) =>
                a.code === b.code ? (a.name < b.name ? -1 : 1) : a.code - b.code
            ) || []
    ).map((r: any) => {
        return {
            'cust id': r.cust_id,
            car_number: r.car_number,
            name: r.name,
            last_seen: (<any>{
                '1': 'Current / Latest',
                '2': 'Previous',
                '3': 'Previous -1',
                '4': 'Previous -2',
                '5': 'Previous -3',
                '99': 'Unknown',
            })[r.code.toString()],
        };
    });

    ret.rows = fRoster;
    ret.leagueId = league;
    ret.season = 0;
    ret.title = 'League Driver Roster';

    return ret;
}
