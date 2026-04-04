import {
    getCuratedLeagueTeamsInfo,
    getLeagueDriverStats,
} from '@@/src/utils/fetch-util';
import type { DriverStats } from 'lplib/endpoint-types/iracing-endpoints';

export interface TeamProfileModel {
    stats: DriverStats;
}

export function getDefaultTeamProfileModel(): TeamProfileModel {
    return {
        stats: {
            cust_id: 0,
            started: 0,
            finished: 0,
            wins: 0,
            podiums: 0,
            top_10: 0,
            top_20: 0,
            fast_laps: 0,
            hard_charger: 0,
            poles: 0,
            power_points: 0,
            incidents: 0,
        },
    };
}

export async function getTeamProfileModel(
    league: string,
    teamId: string
): Promise<TeamProfileModel> {
    let ret = getDefaultTeamProfileModel();

    const driverStatsMap = await getLeagueDriverStats(league);

    let teams = await getCuratedLeagueTeamsInfo(league);

    let driverIdsBySeason: { [name: string]: string[] } = {};

    for (let season of teams.seasons) {
        for (let team of season.teams) {
            if (team.team_id.toString() === teamId) {
                let driversList: string[] =
                    driverIdsBySeason[season.season_id] || [];

                team.team_members
                    .map((v) => v.toString())
                    .forEach((v) => driversList.push(v));

                driverIdsBySeason[season.season_id] = driversList;
            }
        }
    }

    let allDrivers: { [name: string]: boolean } = {};

    for (let season in driverIdsBySeason) {
        let teamList = driverIdsBySeason[season];
        for (let driverId of teamList) {
            allDrivers[driverId] = true;

            let statRow =
                driverStatsMap[parseInt(season)]?.[parseInt(driverId)];

            for (let statKey of Object.keys(ret.stats)) {
                const key = statKey as keyof DriverStats;
                (ret.stats[key] as number) += (statRow?.[key] as number) || 0;
            }
        }
    }

    return ret;
}
