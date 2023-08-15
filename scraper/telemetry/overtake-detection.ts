/**
 *
 * This TypeScript file contains functions for detecting overtaking events in telemetry data from a
 * simulated race. The main function, detectOvertakes, takes in telemetry data for different epochs and a
 * mapping of driver names, and it identifies overtaking maneuvers by comparing the positions of drivers
 * between consecutive epochs. The singleEpochOvertake function analyzes individual epoch data to identify
 * overtaking events based on position changes and percentage progress while considering the presence of
 * other cars. The code focuses on processing telemetry data and generating overtaking event descriptions
 * for further analysis.
 *
 */

import {
    EpochTelemetry,
    PositionChangeEvent,
    DriverTelemetryDatum,
} from './telemetry-types';

function getCarsInFrontOf(
    e: DriverTelemetryDatum[],
    driverId: number
): Set<number> {
    let ret = new Set<number>();

    for (let i = 0; i < e.length; ++i) {
        if (driverId === e[i].driverId) {
            break;
        }
        ret.add(e[i].driverId);
    }

    return ret;
}

function singleEpochOvertake(
    prevE: DriverTelemetryDatum[],
    nextE: DriverTelemetryDatum[],
    time: number,
    driverNames: { [key: number]: string }
): PositionChangeEvent[] {
    let ret: PositionChangeEvent[] = [];

    for (let i = 0; i < Math.min(prevE.length, nextE.length); ++i) {
        let currentDriver = nextE[i].driverId;
        let prevDriversInFront = getCarsInFrontOf(prevE, currentDriver);
        let nextDriversInFront = getCarsInFrontOf(nextE, currentDriver);

        for (let frontP of Array.from(prevDriversInFront.values())) {
            let percDelta =
                nextE[i].perc -
                prevE.find((v) => v.driverId === currentDriver)?.perc;
            if (
                !nextDriversInFront.has(frontP) && // something changed
                percDelta < 0.02 && // didn't teleport
                percDelta > 0 // actually moved
            ) {
                ret.push({
                    directDriverId: currentDriver,
                    indirectDriverId: frontP,
                    time: time,
                    perc: nextE[i].perc,
                    actionType: 'overtakes',
                    lapNumber: Math.floor(nextE[i].perc),
                    position: i,
                    notes: [
                        `${driverNames[currentDriver]} overtakes ${driverNames[frontP]}`,
                    ],
                    indirectNotes: [],
                });
            }
        }
    }

    return ret;
}

export function detectOvertakes(
    epochTelemetry: EpochTelemetry,
    driverNames: { [key: number]: string }
): PositionChangeEvent[] {
    let epochList = epochTelemetry.epochList;

    if (epochList.length < 2) {
        return [];
    }

    let ret: PositionChangeEvent[] = [];

    let prevEpoch = epochList[0];
    let nextEpoch = epochList[1];

    let i = 1;
    // console.log(epochList.length);
    while (i < epochList.length) {
        let sp = JSON.stringify(prevEpoch.data.map((v) => v.driverId));
        let sn = JSON.stringify(nextEpoch.data.map((v) => v.driverId));
        if (sp !== sn) {
            ret.push(
                ...singleEpochOvertake(
                    prevEpoch.data,
                    nextEpoch.data,
                    nextEpoch.time,
                    driverNames
                )
            );
        }

        ++i;
        prevEpoch = nextEpoch;
        nextEpoch = epochList[i];
    }

    return ret;
}
