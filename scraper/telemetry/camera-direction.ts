import {
    EpochTelemetry,
    DriverTelemetryDatum,
    ReplayNote,
    PositionChangeEvent,
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

function findMostActiveDriver(
    overtakes: PositionChangeEvent[],
    time: number
): number {
    let filteredOvertakes = overtakes.filter(
        (o) => o.time > time && o.time < time + 12 * 60
    );
    let visibilityMap: { [name: string]: { id: number; count: number } } = {};
    for (let o of filteredOvertakes) {
        let v = visibilityMap[o.directDriverId];
        if (!v) {
            v = visibilityMap[o.directDriverId] = {
                id: o.directDriverId,
                count: 0,
            };
        }
        v.count += 1;

        v = visibilityMap[o.indirectDriverId];
        if (!v) {
            v = visibilityMap[o.indirectDriverId] = {
                id: o.indirectDriverId,
                count: 0,
            };
        }
        v.count -= 1;
    }
    let keys = Object.keys(visibilityMap);
    if (keys.length) {
        let targetId: number = keys
            .map((k) => visibilityMap[k])
            .sort((a, b) => b.count - a.count)[0].id;

        // console.log(
        //     'visibility',
        //     keys.map((k) => visibilityMap[k]).sort((a, b) => b.count - a.count)
        // );

        return targetId;
    }

    return -1;
}

function findNextTvTarget(
    epoch: {
        time: number;
        data: DriverTelemetryDatum[];
    },
    tvPoints: { [name: number]: number },
    tvTime: { [name: number]: number },
    overtakes: PositionChangeEvent[]
): number {
    let pointsPct = getMapAsPercentages(tvPoints);
    let timePct = getMapAsPercentages(tvTime);

    let ids = Object.keys(pointsPct)
        .sort((a, b) => pointsPct[b] - pointsPct[a])
        .map((v) => Number.parseInt(v, 10));
    let ret = -1;
    let score = getTvScore(pointsPct, timePct);

    if (score < 50) {
        ret = findMostActiveDriver(overtakes, epoch.time);
        // console.log('using most active driver', ret);
    } else {
        // console.log('using tv points');
    }

    if (-1 === ret) {
        ret = ids[0];

        for (let id of ids) {
            if (pointsPct[id] > (timePct[id] || 0)) {
                if (epoch.data.find((v) => v.driverId === id).percD <= 30) {
                    // console.log('skipping id:', id);
                } else {
                    ret = id;
                    break;
                }
            }
        }
    }

    // console.log('\n\n\n\n');
    // console.log('score:', score);
    // console.log(ids);
    // console.log(pointsPct);
    // console.log(timePct);

    return ret;
}

function getFinishingNotes(tel: EpochTelemetry): ReplayNote[] {
    let nextP = 1;
    let finishedSet = new Set<number>();
    let ret: ReplayNote[] = [];

    console.log(tel.checkeredFlag, 'checker');

    let data = tel.epochList.filter(
        (v) => v.time >= tel.checkeredFlag - 3 * 60
    );

    for (let i = 0; i < data.length - 1; ++i) {
        let c = data[i];
        let n = data[i + 1];
        let ids = n.data.map((v) => v.driverId);

        for (let id of ids) {
            let percA = c.data.find((v) => v.driverId === id).perc;
            let percB = n.data.find((v) => v.driverId === id).perc;

            // console.log(c.time, id, Math.floor(percA), Math.floor(percB));

            if (
                !finishedSet.has(id) &&
                Math.floor(percA) !== Math.floor(percB)
            ) {
                ret.push({ time: c.time, lookAt: id, note: ['finished'] });
                finishedSet.add(id);
            }
        }
    }

    let nextT = tel.checkeredFlag - 8 * 60;
    for (let n of ret) {
        let t = n.time;
        n.time = nextT + 3 * 60;
        nextT = t;
    }

    return ret;
}

export function getCameraScript(
    tel: EpochTelemetry,
    overtakes: PositionChangeEvent[]
): ReplayNote[] {
    let tvPoints: { [name: number]: number } = {};
    let tvTime: { [name: number]: number } = {};
    let numCarsG = tel.epochList[tel.epochList.length - 1].data.length;
    let startTime = -1;
    let camStartTime = -1;
    let camTarget = -1;

    let notes: ReplayNote[] = [];

    for (let epoch of tel.epochList) {
        let numCars = epoch.data.length;

        if (numCarsG !== numCars || epoch.data[0].perc < 0) {
            continue;
        }
        if (camStartTime === -1) {
            startTime = camStartTime = epoch.time - 20 * 60;
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
            camTarget = findNextTvTarget(epoch, tvPoints, tvTime, overtakes);
            camStartTime = epoch.time;

            notes.push({
                time: epoch.time,
                lookAt: camTarget,
                note: [],
            });

            // console.log('\n\ntime', (epoch.time - startTime) / (60 * 60));
            // logTvPoints(tvPoints);
            // logTvPoints(tvTime);
        }
    }

    // filter out all the notes after the checkered flag
    notes = notes.filter((v) => v.time < tel.checkeredFlag);

    notes.push(...getFinishingNotes(tel));

    return notes;
}
