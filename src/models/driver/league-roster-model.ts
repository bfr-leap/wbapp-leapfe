import {
    getLeagueRoster,
    getLeagueSeasons,
    getMembersData,
} from '@@/src/utils/fetch-util';

interface RosterEntry {
    cust_id: number;
    car_number: string;
    display_name: string;
    [key: string]: unknown;
}

interface RosterRow {
    'cust id': number;
    car_number: string;
    name: string;
    last_seen: string;
}

export interface LeagueRosterModel {
    rows: RosterRow[];
    leagueId: string | number;
    season: number;
    title: string;
}

const LAST_SEEN_LABELS: Record<string, string> = {
    '1': 'Current / Latest',
    '2': 'Previous',
    '3': 'Previous -1',
    '4': 'Previous -2',
    '5': 'Previous -3',
    '99': 'Unknown',
};

export function getDefaultRosterModel(): LeagueRosterModel {
    return {
        rows: [],
        leagueId: 0,
        season: 0,
        title: 'League Driver Roster',
    };
}

interface ScoredRosterEntry {
    cust_id: number;
    car_number: string;
    name: string;
    code: number;
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

    const fRoster: RosterRow[] = (
        (roster?.roster as RosterEntry[])
            ?.map((m: RosterEntry): ScoredRosterEntry => {
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
            .sort((a: ScoredRosterEntry, b: ScoredRosterEntry) =>
                a.code === b.code
                    ? a.name < b.name
                        ? -1
                        : 1
                    : a.code - b.code
            ) || []
    ).map((r: ScoredRosterEntry): RosterRow => {
        return {
            'cust id': r.cust_id,
            car_number: r.car_number,
            name: r.name,
            last_seen:
                LAST_SEEN_LABELS[r.code.toString()] || 'Unknown',
        };
    });

    ret.rows = fRoster;
    ret.leagueId = league;
    ret.season = 0;
    ret.title = 'League Driver Roster';

    return ret;
}
