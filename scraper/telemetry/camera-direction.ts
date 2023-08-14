import {
    EpochTelemetry,
    DriverTelemetryDatum,
    ReplayNote,
} from './telemetry-types.js';

function getMapAsPercentages(points: { [name: number]: number }): {
    [name: number]: number;
} {
    let ret: { [name: number]: number } = {};

    let l = Object.keys(points).map((v) => {
        return { p: points[v], d: v };
    });

    let lst: number[] = l.map((v) => v.p);
    let tot = 0;

    for (let v of lst) {
        tot += v;
    }

    for (let k of Object.keys(points)) {
        ret[k] = (100 * points[k]) / tot;
    }

    return ret;
}

function logTvPoints(tvPoints: { [name: number]: number }) {
    let percPoints = getMapAsPercentages(tvPoints);
    let l = Object.keys(percPoints)
        .map((v) => {
            return { p: percPoints[v], d: v };
        })
        .sort((a, b) => b.p - a.p);

    let lst: number[] = l.map((v) => v.p);

    console.log('[');
    for (let v of lst) {
        console.log(v);
    }
    console.log(']');
}

function getTvScore(
    pointsPct: { [name: number]: number },
    timePct: { [name: number]: number }
) {
    let ids = Object.keys(pointsPct)
        .sort((a, b) => pointsPct[b] - pointsPct[a])
        .map((v) => Number.parseInt(v, 10));

    let score = 0;

    for (let id of ids) {
        if (pointsPct[id] > (timePct[id] || 0)) {
            score += pointsPct[id] - (timePct[id] || 0);
        }
    }

    return score;
}

function findNextTvTarget(
    epoch: {
        time: number;
        data: DriverTelemetryDatum[];
    },
    tvPoints: { [name: number]: number },
    tvTime: { [name: number]: number }
): number {
    let pointsPct = getMapAsPercentages(tvPoints);
    let timePct = getMapAsPercentages(tvTime);

    let ids = Object.keys(pointsPct)
        .sort((a, b) => pointsPct[b] - pointsPct[a])
        .map((v) => Number.parseInt(v, 10));
    let ret = ids[0];
    let score = getTvScore(pointsPct, timePct);

    // console.log('\n\n\n\n');
    // console.log('score:', score);
    // console.log(ids);
    // console.log(pointsPct);
    // console.log(timePct);

    for (let id of ids) {
        if (
            pointsPct[id] > (timePct[id] || 0) &&
            epoch.data.find((v) => v.driverId === id).percD > 0
        ) {
            ret = id;
            break;
        }
    }

    return ret;
}

export function getCameraScript(tel: EpochTelemetry): ReplayNote[] {
    let tvPoints: { [name: number]: number } = {};
    let tvTime: { [name: number]: number } = {};
    let numCarsG = tel.epochList[tel.epochList.length - 1].data.length;
    let startTime = -1;
    let camStartTime = -1;
    let camTarget = -1;

    let notes: ReplayNote[] = [];

    for (let epoch of tel.epochList) {
        let numCars = epoch.data.length;

        if (numCarsG !== numCars) {
            continue;
        }
        if (camStartTime === -1) {
            camStartTime = epoch.time;
            startTime = epoch.time;
            camTarget = epoch.data[0].driverId;
        }

        for (let i = 0; i < numCars; ++i) {
            let pointsThisFrame = Math.pow(numCars - i, 2) + 100;
            tvPoints[epoch.data[i].driverId] =
                pointsThisFrame + (tvPoints[epoch.data[i].driverId] || 0);
        }

        tvTime[camTarget] = 1 + (tvTime[camTarget] || 0);

        if (epoch.time - camStartTime > 12 * 60) {
            // 12 seconds worth of frames
            camTarget = findNextTvTarget(epoch, tvPoints, tvTime);
            camStartTime = epoch.time;

            notes.push({
                time: epoch.time,
                lookAt: camTarget,
                note: '',
            });

            // console.log('\n\ntime', (epoch.time - startTime) / (60 * 60));
            // logTvPoints(tvPoints);
            // logTvPoints(tvTime);
        }
    }

    return notes;
}
