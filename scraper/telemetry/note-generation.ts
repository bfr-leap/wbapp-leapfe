import {
    ReplayNote,
    PositionChangeEvent,
    EpochTelemetry,
    DriverTelemetryDatum,
} from './telemetry-types';
import {
    LapChartData,
    SimsessionResults,
} from '../../src/iracing-endpoints.js';
import { createCompletion } from '../openai/openai-endpoints.js';

async function narrate(notes: ReplayNote[], lapChartData: LapChartData) {
    for (let n of notes) {
        let eventPrompt = [
            `The following broadcast notes:`,
            ...n.note.map((t) => `    ${t}`),
            ``,
            `This is what a succinct, opinionated, bold, brash, and often controversial broadcaster can say in 3 seconds skipping details for brevity:`,
        ];

        let newComment = await createCompletion(eventPrompt.join('\n'));

        n.note.push(newComment);
    }
}

export async function generateNoteText(
    notes: ReplayNote[],
    overtakes: PositionChangeEvent[],
    lapChartData: LapChartData,
    telemetry: EpochTelemetry,
    driverNames: { [name: number]: string },
    simsessionResults: SimsessionResults
) {
    let driverLastLookAtMap: { [name: string]: number } = {};

    let first = true;
    let lastLap = 0;

    for (let n of notes) {
        let lastLookAt = driverLastLookAtMap[n.lookAt] || 0;

        if (first) {
            n.note.push('race starts');
            first = false;
        }

        if (n.note.length === 1 && n.note[0] === 'finished') {
            let p = simsessionResults.results.find(
                (v) => v.cust_id === n.lookAt
            ).position;
            n.note.push(`${driverNames[n.lookAt]} finishes position ${p}`);
            continue;
        }

        let liveTelemetry: {
            time: number;
            data: DriverTelemetryDatum[];
        } = telemetry.epochList.find((e) => e.time > n.time);

        let p = 0;
        let currentLap = Math.floor(
            liveTelemetry.data.find((d, i) => {
                p = i + 1;
                return d.driverId === n.lookAt;
            }).perc
        );

        if (currentLap !== lastLap) {
            n.note.push(
                `We are on lap ${currentLap} looking at ${
                    driverNames[n.lookAt]
                } running P ${p}`
            );
        } else {
            n.note.push(
                `We are looking at ${driverNames[n.lookAt]} running P ${p}`
            );
        }

        let pastPositiveMoves = overtakes.filter(
            (o) =>
                o.time > lastLookAt &&
                o.time < n.time &&
                o.directDriverId === n.lookAt
        );

        let pastNegativeMoves = overtakes.filter(
            (o) =>
                o.time > lastLookAt &&
                o.time < n.time &&
                o.indirectDriverId === n.lookAt
        );

        let currentOvertakes = overtakes.filter(
            (o) =>
                o.time > n.time &&
                o.time < n.time + 60 * 12 &&
                o.directDriverId === n.lookAt
        );

        let currentNegativeMoves = overtakes.filter(
            (o) =>
                o.time > n.time &&
                o.time < n.time + 60 * 12 &&
                o.indirectDriverId === n.lookAt
        );

        for (let o of pastNegativeMoves) {
            let lap = Math.floor(o.perc);
            n.note.push(
                `On lap ${lap}, ${
                    driverNames[o.indirectDriverId]
                } lost position to ${driverNames[o.directDriverId]}`
            );
        }

        for (let o of pastPositiveMoves) {
            let lap = Math.floor(o.perc);
            n.note.push(
                `On lap ${lap}, ${driverNames[o.directDriverId]} overtook ${
                    driverNames[o.indirectDriverId]
                }`
            );
        }

        for (let o of currentOvertakes) {
            n.note.push(
                `Currently, ${
                    driverNames[o.directDriverId]
                } is bringing the fight to ${
                    driverNames[o.indirectDriverId]
                } from position ${p}`
            );
        }

        for (let o of currentNegativeMoves) {
            n.note.push(
                `Currently, ${driverNames[o.indirectDriverId]} struggles with ${
                    driverNames[o.directDriverId]
                }`
            );
        }

        if (n.note.length < 2) {
            n.note.push(
                `${driverNames[n.lookAt]} is holding on to position ${p}`
            );
        }

        driverLastLookAtMap[n.lookAt] = n.time;
        lastLap = currentLap;
    }

    await narrate(notes, lapChartData);
}
