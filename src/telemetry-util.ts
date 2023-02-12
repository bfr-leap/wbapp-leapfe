import type { ST_DriverTelemetry } from './iracing-endpoints';
import { getSimsessionDriverTelemetry } from '@/fetch-util';

function getIdealLap(t: ST_DriverTelemetry): number {
    let completeLapTimes: number[] = [];
    let s1Times: number[] = [];
    let s2Times: number[] = [];
    let s3Times: number[] = [];

    for (let lap of t.laps) {
        let startT = lap.telemetry[0].t;
        let endT = lap.telemetry[lap.telemetry.length - 1].t;

        let isValidLapData = true;

        for (let i = 0; i < lap.telemetry.length; ++i) {
            let tel = lap.telemetry[i];
            if (i !== Math.floor(tel.perc * 100)) {
                isValidLapData = false;
                break;
            }
        }

        if (!isValidLapData) {
            continue;
        }

        if (lap.telemetry.length >= 33) {
            s1Times.push((lap.telemetry[32].t - lap.telemetry[0].t) / 60);
        }

        if (lap.telemetry.length >= 66) {
            s2Times.push((lap.telemetry[65].t - lap.telemetry[32].t) / 60);
        }

        let isCompleteLap = lap.telemetry.length === 101;

        if (isCompleteLap) {
            completeLapTimes.push((endT - startT) / 60);
            s3Times.push((lap.telemetry[100].t - lap.telemetry[65].t) / 60);
        }
    }

    let fastestLap = Math.min(...completeLapTimes);
    // console.log(t.id);
    // console.log(`fastest lap time: ${fastestLap}`);
    // console.log(
    //     `sectors: ${Math.min(...s1Times)} ${Math.min(...s3Times)} ${Math.min(
    //         ...s3Times
    //     )}`
    // );
    let optimalLap =
        Math.min(...s1Times) + Math.min(...s3Times) + Math.min(...s3Times);
    // console.log(`optimal: ${optimalLap}`);
    // console.log(`optimal/fastest delta: ${fastestLap - optimalLap}`);
    // console.log('\n\n\n\n\n\n');

    return optimalLap;
}

export async function getIdealLaps(
    subsession: string,
    simsession: string,
    drivers: string[]
): Promise<number[]> {
    let telemetry: ST_DriverTelemetry[] = [];

    for (let driver of drivers) {
        let t = await getSimsessionDriverTelemetry(
            subsession,
            simsession,
            driver
        );

        telemetry.push(t);
    }

    return telemetry.map((t) => getIdealLap(t));
}
