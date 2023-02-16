import type { ST_DriverTelemetry, ST_LapTelemetry } from './iracing-endpoints';
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

    let optimalLap =
        Math.min(...s1Times) + Math.min(...s2Times) + Math.min(...s3Times);

    return optimalLap;
}

function getBestLap(t: ST_DriverTelemetry): ST_LapTelemetry {
    let r: ST_LapTelemetry = {
        lapNumber: 1,
        telemetry: [],
    };
    let fastest = Infinity;

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

        if (!isValidLapData || lap.telemetry.length !== 101) {
            continue;
        }

        // return the first lap for now
        if (fastest > endT - startT) {
            r = lap;
            fastest = endT - startT;
        }
    }

    return r;
}

function getLapTime(t: ST_LapTelemetry): number {
    return (t.telemetry[t.telemetry.length - 1].t - t.telemetry[0].t) / 60;
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

export async function getBestLaps(
    subsession: string,
    simsession: string,
    drivers: string[]
): Promise<ST_LapTelemetry[]> {
    let telemetry: ST_DriverTelemetry[] = [];

    for (let driver of drivers) {
        let t = await getSimsessionDriverTelemetry(
            subsession,
            simsession,
            driver
        );

        telemetry.push(t);
    }

    return telemetry.map((t) => getBestLap(t));
}
