/**
 *
 * This TypeScript file contains a function named reconstructEpochTelemetry that takes input data related
 * to iRacing telemetry and session results. It processes the telemetry data to reconstruct driver positions
 * and metrics over time during a race session, using a series of calculations and sorting operations.
 * The function ultimately returns an object representing epoch-based telemetry, including lap counts, flag
 * time, and sorted driver data.
 *
 */

import { EpochTelemetry, DriverTelemetryDatum } from './telemetry-types.js';
import { getSubsessionTelemetry } from '../iracing/iracing-scraped-data-loader.js';
import { getSimSessionResults } from '../iracing/iracing-derived-data-loader.js';
import {
    ST_SimsessionTelemetry,
    SimsessionResults,
    ST_TelemetryDatum,
} from '../../src/iracing-endpoints.js';

function clone(obj: any): any {
    return JSON.parse(JSON.stringify(obj));
}

let _maxPercD = 0;

function pushNextTrackPosition(
    dA: ST_TelemetryDatum,
    dB: ST_TelemetryDatum,
    buffer: ST_TelemetryDatum[],
    numRaceLaps: number
) {
    const fAt = Math.floor(dA.t / 60);
    const fBt = Math.floor(dB.t / 60);
    if (fAt === fBt) {
        return;
    }

    const delta = fBt - fAt;

    let newT = Math.floor(dB.t / 60) * 60;

    let newPerc =
        dA.perc + ((newT - dA.t) * (dB.perc - dA.perc)) / (dB.t - dA.t);

    let newPercD = (dB.perc - dA.perc) / (dB.t - dA.t);

    if (newPerc > 3) {
        _maxPercD = Math.max(_maxPercD, newPercD);
    }

    const hasCrossedStartFinish =
        buffer.length > 0
            ? buffer[buffer.length - 1].perc > numRaceLaps
            : false;

    if (newPerc > -100 && !hasCrossedStartFinish) {
        for (let i = 1; i < delta; ++i) {
            let newTL = newT - i * 60;
            let newPercL =
                dA.perc +
                ((newTL - dA.t) * (dB.perc - dA.perc)) / (dB.t - dA.t);

            let d = { perc: newPercL, percD: newPercD, t: newT - i * 60 };
            buffer.push(d);
        }

        let d = { perc: newPerc, percD: newPercD, t: newT };
        buffer.push(d);
    }
}

export async function reconstructEpochTelemetry(
    subsessionId: number,
    simsessionId: number,
    driverNames: { [name: string]: string }
): Promise<EpochTelemetry> {
    _maxPercD = 0;
    const simsessionResults: SimsessionResults = getSimSessionResults(
        subsessionId,
        simsessionId
    );
    const sTelemetry: ST_SimsessionTelemetry = getSubsessionTelemetry(
        subsessionId
    ).find((v) => v.id === simsessionId);

    let dA: ST_TelemetryDatum = { perc: 0, percD: 0, t: 0 };
    let dB: ST_TelemetryDatum = { perc: 0, percD: 0, t: 0 };

    let dataByTime: {
        [name: string]: DriverTelemetryDatum[];
    } = {};

    // convert the by-driver telemetry to by-time telemetry
    for (let driverTelemetry of sTelemetry.drivers) {
        const lapsCompleted = simsessionResults.results.find(
            (v) => v.cust_id === driverTelemetry.id
        ).laps_completed;

        let driverDataArray: ST_TelemetryDatum[] = [];
        for (let lap of driverTelemetry.laps) {
            for (let t of lap.telemetry) {
                dA = dB;
                dB = {
                    perc: t.perc + lap.lapNumber - 1,
                    percD: t.percD,
                    t: t.t,
                };

                if (dA.t !== 0) {
                    pushNextTrackPosition(
                        dA,
                        dB,
                        driverDataArray,
                        lapsCompleted
                    );
                }
            }
        }

        let driverDataArrayWithId: ({
            driverId: number;
        } & ST_TelemetryDatum)[] = driverDataArray.map((v) => {
            return { driverId: driverTelemetry.id, ...v };
        });

        for (let driverDataWithId of driverDataArrayWithId) {
            if (driverDataWithId.perc < 0) {
                continue;
            }

            let a = dataByTime[driverDataWithId.t];
            if (!a) {
                a = dataByTime[driverDataWithId.t] = [];
            }

            a.push({
                driverId: driverDataWithId.driverId,
                driverName: driverNames[driverDataWithId.driverId],
                perc: driverDataWithId.perc,
                percD: driverDataWithId.percD,
            });
        }
    }

    // sort the by-time telemetry considering track position
    let epochList = Object.keys(dataByTime)
        .map((k) => {
            return {
                time: Number.parseInt(k),
                data: dataByTime[k].sort((a, b) => b.perc - a.perc),
            };
        })
        .sort((a, b) => a.time - b.time);

    for (let e of epochList) {
        for (let d of e.data) {
            d.percD = (300 * d.percD) / _maxPercD;
        }
    }

    // console.log('raw epochList start');
    // console.log(JSON.stringify(epochList, null, '    '));
    // console.log('raw epochList end\n\n\n\n');

    // prepare intermediate values for further processing
    let lastSeenEpochIndexByDriverId: { [name: string]: number } = {};
    let lastSeenDriverDataByDriverId: {
        [name: string]: {
            driverId: number;
            perc: number;
            percD: number;
        };
    } = {};
    for (let i = 0; i < epochList.length; ++i) {
        let e = epochList[i];
        for (let d of e.data) {
            lastSeenEpochIndexByDriverId[d.driverId] = i;
            lastSeenDriverDataByDriverId[d.driverId] = d;
        }
    }
    let checkerFlagEpochIndex =
        lastSeenEpochIndexByDriverId[simsessionResults.results[0].cust_id];

    let driverIds: number[] = simsessionResults.results.map((v) => v.cust_id);

    // fill in missing drivers for each epoch
    for (let i = 0; i < epochList.length; ++i) {
        let e = epochList[i];

        for (let driverId of driverIds) {
            if (lastSeenEpochIndexByDriverId[driverId] < i) {
                let c = clone(lastSeenDriverDataByDriverId[driverId]);
                c.percD = 0;
                e.data.push(c);
            }
        }
    }

    for (let e of epochList) {
        e.data = e.data.sort((a, b) => b.perc - a.perc);
    }

    let ret = {
        numLaps: simsessionResults.results[0].laps_completed,
        checkeredFlag: epochList[checkerFlagEpochIndex].time,
        epochList: epochList,
    };

    return ret;
}
