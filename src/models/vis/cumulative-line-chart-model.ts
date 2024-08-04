import type { SeriesXY } from '@@/src/models/vis/line-chart-model';

export interface CumulativeLineChartModel {
    titleOut: string;
    seriesOut: SeriesXY[];
    yRange: number[];
}

export function getDefaultCumulativeLineChartModel(): CumulativeLineChartModel {
    return JSON.parse(
        JSON.stringify({ titleOut: '', seriesOut: [], yRange: [] })
    );
}

export function getCumulativeLineChartModel(
    series: SeriesXY[]
): CumulativeLineChartModel {
    let ret = getDefaultCumulativeLineChartModel();
    series = series.filter((s) => s.data.length >= 1);
    const seriesAndDelta = getSeriesDeltas(series);

    const baseLine = seriesAndDelta.baselineTime;

    ret.titleOut = `Baseline ${Number(baseLine).toFixed(2)}s`;

    ret.seriesOut = seriesAndDelta.data;

    if (!ret.seriesOut.length) {
        return getDefaultCumulativeLineChartModel();
    }

    ret.yRange[0] = ret.seriesOut[0].data[0]?.y || 1;
    ret.yRange[1] = ret.seriesOut[0].data[0]?.y || 1;

    let lapNum = (ret.seriesOut[0].data.length = ret.seriesOut[0].data.length);

    const relevantLapPercent = 0.95;

    for (let singleSeries of ret.seriesOut) {
        let r1 = ret.yRange[0];
        let r2 = ret.yRange[1];
        for (let lDelta of singleSeries.data) {
            r1 = Math.max(r1, lDelta.y);
            r2 = Math.min(r2, lDelta.y);
        }

        if (lapNum * relevantLapPercent <= singleSeries.data.length) {
            ret.yRange[0] = r1;
            ret.yRange[1] = r2;
        } else {
            break;
        }
    }

    return ret;
}

function getSeriesDeltas(lapTimes: SeriesXY[]): {
    data: SeriesXY[];
    baselineTime: number;
} {
    let baselineTime =
        lapTimes
            .map((driverLaps: SeriesXY) =>
                driverLaps.data.map((lapTime) => lapTime.y)
            )
            .map((tA) => tA.reduce((a, b) => a + b / tA.length, 0))[0] * 1.07;

    // this is the old baseline calculation  TODO:: remove
    // let baselineTime = Math.round(
    //     lapTimes
    //         .map((driverLaps: SeriesXY) =>
    //             driverLaps.data
    //                 .map((lapTime) => lapTime.y)
    //                 .reduce(function (min, value, _, { length }) {
    //                     if (value <= 1 || isNaN(value)) {
    //                         return min;
    //                     }
    //                     return Math.min(min, value);
    //                 }, Infinity)
    //         )
    //         .reduce(function (min, value, _, { length }) {
    //             if (value <= 1 || isNaN(value)) {
    //                 return min;
    //             }
    //             return Math.min(min, value);
    //         }, Infinity) * 1.07
    // );

    // if rounding doesn't work try again
    if (baselineTime === Infinity || baselineTime === 1) {
        baselineTime =
            lapTimes
                .map(
                    (driverLaps: SeriesXY) =>
                        driverLaps.data
                            .map((lapTime) => lapTime.y)
                            .reduce(function (p, value, _, { length }) {
                                if (value <= 0 || isNaN(value)) {
                                    return Infinity;
                                }
                                return p + value;
                            }, 0) / driverLaps.data.length
                )
                .reduce(function (min, value, _, { length }) {
                    if (isNaN(value)) {
                        return min;
                    }
                    return Math.min(min, value);
                }, Infinity) * 1.07;
    }

    let ret: { x: number; y: number }[][] = lapTimes.map((dLapTimes) =>
        dLapTimes.data.map((dLapTime) => {
            return {
                x: dLapTime.x,
                y: dLapTime.y - baselineTime,
            };
        })
    );

    for (let dDeltas of ret) {
        dDeltas.shift();

        for (let i = 1; i < dDeltas.length; ++i) {
            dDeltas[i].y += dDeltas[i - 1].y;
        }
    }

    return {
        data: ret.map((v, i) => {
            return { name: lapTimes[i].name, data: v };
        }),
        baselineTime,
    };
}
