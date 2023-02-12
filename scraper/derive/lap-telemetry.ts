import { readFileSync } from 'fs';

import { wf } from './file-writer.js';

const MNT_PT = './public/data/scraped/telemetry/';

interface ST_TelemetryDatum {
    perc: number;
    percD: number;
    t: number;
}

interface ST_LapTelemetry {
    lapNumber: number;
    telemetry: ST_TelemetryDatum[];
}

interface ST_DriverTelemetry {
    id: number;
    laps: ST_LapTelemetry[];
}

interface ST_SimsessionTelemetry {
    id: number;
    drivers: ST_DriverTelemetry[];
}

type SubsessionTelemetry = ST_SimsessionTelemetry[];

function rectifyLapEnds(subsession: SubsessionTelemetry) {
    for (let simsession of subsession) {
        for (let driver of simsession.drivers) {
            let pLap = null;
            for (let lap of driver.laps) {
                if (pLap) {
                    pLap.telemetry.push({
                        perc: 1,
                        percD: lap.telemetry[0].percD,
                        t: lap.telemetry[0].t,
                    });
                }

                pLap = lap;
            }
        }
    }
}

export function deriveLapTelemetry(subssesionId: number) {
    let telem = <SubsessionTelemetry>JSON.parse(
        readFileSync(`${MNT_PT}${subssesionId}.json`, {
            encoding: 'utf8',
            flag: 'r',
        })
    );

    rectifyLapEnds(telem);

    for (let simsession of telem) {
        for (let driver of simsession.drivers) {
            let completeLapTimes: number[] = [];
            let s1Times: number[] = [];
            let s2Times: number[] = [];
            let s3Times: number[] = [];

            wf(
                driver,
                `simsessionDriverTelemetry_${subssesionId}_${simsession.id}_${driver.id}.json`
            );

            for (let lap of driver.laps) {
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
                    s1Times.push(
                        (lap.telemetry[32].t - lap.telemetry[0].t) / 60
                    );
                }

                if (lap.telemetry.length >= 66) {
                    s2Times.push(
                        (lap.telemetry[65].t - lap.telemetry[32].t) / 60
                    );
                }

                let isCompleteLap = lap.telemetry.length === 101;

                if (isCompleteLap) {
                    completeLapTimes.push((endT - startT) / 60);
                    s3Times.push(
                        (lap.telemetry[100].t - lap.telemetry[65].t) / 60
                    );
                }
            }

            // if (simsession.id === -4) {
            //     // if (driver.id === 732815) {
            //     if (driver.id === 601143) {
            //         //if (driver.id === 115698) {

            //         let fastestLap = Math.min(...completeLapTimes);

            //         console.log(`fastest lap time: ${fastestLap}`);

            //         console.log(
            //             `sectors: ${Math.min(...s1Times)} ${Math.min(
            //                 ...s3Times
            //             )} ${Math.min(...s3Times)}`
            //         );

            //         let optimalLap =
            //             Math.min(...s1Times) +
            //             Math.min(...s3Times) +
            //             Math.min(...s3Times);

            //         console.log(`optimal: ${optimalLap}`);
            //         console.log(
            //             `optimal/fastest delta: ${fastestLap - optimalLap}`
            //         );
            //     }
            // }
        }
    }
}
