import {
    getTelemetrySubsessionIds,
    getPacePercentChartData,
    getPacePercentVsIdealLapChartData,
} from '@@/src/utils/fetch-util';

export interface PaceChartModel {
    title: string;
    barChartData: { name: string; value: number }[];
}

export function getDefaultPaceChartModel(): PaceChartModel {
    return JSON.parse(
        JSON.stringify({
            title: 'Pace Percent',
            barChartData: [
                { name: 'a', value: 1 },
                { name: 'b', value: 2 },
            ],
        })
    );
}

export async function getPaceChartModel(
    subsession: string,
    simsession: string,
    league: string
): Promise<PaceChartModel> {
    let ret: PaceChartModel = getDefaultPaceChartModel();
    ret.barChartData = [];

    if (
        simsession == undefined ||
        subsession == undefined ||
        league == undefined
    ) {
        return ret;
    }

    let telemetrySubsessionIds = await getTelemetrySubsessionIds(league);
    let telemetryAvailable =
        -1 !==
        (telemetrySubsessionIds?.indexOf(parseInt(subsession, 10)) || -1);

    if (telemetryAvailable) {
        let x = await getPacePercentVsIdealLapChartData(
            league,
            subsession,
            simsession
        );
        ret.barChartData = x.map((v) => {
            return {
                name: <string>v['name'],
                value: <number>v['pace'],
                value2: <number>v['ideal'],
            };
        });
    } else {
        let x = await getPacePercentChartData(league, subsession, simsession);
        ret.barChartData = x.map((v) => {
            return {
                name: <string>v['name'],
                value: <number>v['pace'],
            };
        });
    }

    return ret;
}
