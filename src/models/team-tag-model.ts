import {
    getCuratedLeagueTeamsInfo,
    getSingleMemberData,
} from '@/utils/fetch-util';
import { getFirstLastNames, getFormulaLicense } from '@/utils/driver-utils';

interface TeamTagDriverModel {
    lastname: string;
    driverId: string;
}

export interface TeamTagModel {
    name: string;
    sof: string;
    drivers: TeamTagDriverModel[];
}

async function sortDriverIdsByIRating(driverIds: string[]) {
    let driverIRatings: { [name: string]: number } = {};

    for (let driverId of driverIds) {
        let driver = await getSingleMemberData(driverId.toString());
        let raiting = getFormulaLicense(driver.licenses).irating;
        driverIRatings[driverId] = raiting;
    }

    let sortedDriverIds = driverIds.sort((a, b) => {
        return driverIRatings[b] - driverIRatings[a];
    });

    return sortedDriverIds;
}

export function getDefaultTeamTagModel(): TeamTagModel {
    return {
        name: '----',
        sof: '----',
        drivers: [
            { lastname: '----', driverId: '' },
            { lastname: '----', driverId: '' },
            { lastname: '----', driverId: '' },
        ],
    };
}

export async function getTeamTagModel(
    teamId: number,
    leagueId: string
): Promise<TeamTagModel> {
    let ret: TeamTagModel = {
        name: '----',
        sof: '----',
        drivers: [],
    };

    if (!leagueId) {
        return ret;
    }

    let teams = await getCuratedLeagueTeamsInfo(leagueId);

    let sortedSeasons = teams.seasons.sort((a, b) => {
        return b.season_id - a.season_id;
    });

    for (let season of sortedSeasons) {
        for (let team of season.teams) {
            if (team.team_id === teamId) {
                ret = {
                    name: team.team_name,
                    sof: '',
                    drivers: [],
                };
                let driverIds = await sortDriverIdsByIRating(
                    team.team_members.map((v) => v.toString())
                );

                let cumulativeIRating = 0;

                for (let driverId of driverIds) {
                    let driver = await getSingleMemberData(driverId.toString());
                    let raiting = getFormulaLicense(driver.licenses).irating;
                    cumulativeIRating += raiting;
                    ret.drivers.push({
                        lastname: getFirstLastNames(driver.display_name)
                            .lastName,
                        driverId: driverId,
                    });
                }

                let averageRating = cumulativeIRating / driverIds.length;

                ret.sof =
                    Math.floor(averageRating / 1000).toFixed(0) +
                    '.' +
                    ((averageRating % 1000) / 100).toFixed(0) +
                    'k';

                return ret;
            }
        }
    }

    return ret;
}
