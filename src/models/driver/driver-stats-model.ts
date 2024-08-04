import type {
    DriverResults,
    SSR_ResultsEntry,
} from 'lplib/endpoint-types/iracing-endpoints';
import { getShortSubsessionName } from '@@/src/utils/session-utils';

async function getNames(
    leagueId: string,
    seasonRaceResults: {
        [name: number]: SSR_ResultsEntry;
    }
) {
    const names: { [name: string]: string } = {};

    let sessionKeys = Object.keys(seasonRaceResults)
        .map((v) => Number.parseInt(v, 10))
        .sort((a, b) => a - b);

    let usedNames: { [name: string]: boolean } = {};

    for (let subsessionIt of sessionKeys) {
        let shortName = await getShortSubsessionName(
            leagueId,
            subsessionIt.toString()
        );

        while (usedNames[shortName]) {
            shortName += ' ';
        }

        usedNames[shortName] = true;
        names[subsessionIt] = shortName;
    }

    return names;
}

async function getQualifyingChartData(
    quali: DriverResults,
    seasonId: number,
    leagueId: string
): Promise<{ name: string; value: number }[]> {
    if (!quali || !quali[seasonId]) {
        return [];
    }
    const seasonRaceResults = quali[seasonId];

    const names = await getNames(leagueId, seasonRaceResults);

    let sessionKeys = Object.keys(seasonRaceResults)
        .map((v) => Number.parseInt(v, 10))
        .sort((a, b) => a - b);

    const data = sessionKeys.map((k) => {
        const entry = seasonRaceResults[k];
        return {
            name: names[k.toString()] || k.toString(),
            value: entry.pace_percent,
        };
    });

    const filteredData = data.filter((d) => d.value !== null);

    return filteredData;
}

async function getStartFinishChartData(
    qualiResults: DriverResults,
    raceResults: DriverResults,
    sprintResults: DriverResults,
    seasonId: number,
    leagueId: string
): Promise<{ name: string; hi: number; lo: number }[]> {
    if (!qualiResults || !qualiResults[seasonId]) {
        return [];
    }

    const seasonRaceResults = qualiResults[seasonId];

    const names = await getNames(leagueId, seasonRaceResults);

    let sessionKeys = Object.keys(seasonRaceResults)
        .map((v) => Number.parseInt(v, 10))
        .sort((a, b) => a - b);

    let ret = <{ name: string; hi: number; lo: number }[]>sessionKeys.flatMap(
        (k) => {
            const sprint = sprintResults?.[seasonId]?.[k] || null;
            const race = raceResults?.[seasonId]?.[k] || null;
            return [
                sprint
                    ? {
                          name:
                              (names[k.toString()] || k.toString()) + ':Sprint',
                          lo:
                              -1 *
                              (sprint.start_position === 0
                                  ? sprint.position
                                  : sprint.start_position),
                          hi: -1 * sprint.position,
                      }
                    : null,
                race
                    ? {
                          name: (names[k.toString()] || k.toString()) + ':Race',
                          lo:
                              -1 *
                              (race.start_position === 0
                                  ? race.position
                                  : race.start_position),
                          hi: -1 * race.position,
                      }
                    : null,
            ].filter((a) => a !== null);
        }
    );

    return ret;
}

export interface DriverStatsModel {
    qualifyingChartData: { name: string; value: number }[];
    startFinishChartData: { name: string; hi: number; lo: number }[];
}

export async function getDriverStatsModel(
    quali: DriverResults,
    race: DriverResults,
    sprint: DriverResults,
    seasonId: number,
    leagueId: string
): Promise<DriverStatsModel> {
    let ret = getDefaultDriverStatsModel();

    ret.qualifyingChartData = await getQualifyingChartData(
        quali,
        seasonId,
        leagueId
    );

    ret.startFinishChartData = await getStartFinishChartData(
        quali,
        race,
        sprint,
        seasonId,
        leagueId
    );

    return ret;
}

export function getDefaultDriverStatsModel(): DriverStatsModel {
    return {
        qualifyingChartData: [],
        startFinishChartData: [],
    };
}
