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
    let introPrompt = `The following is session information for a wheel to wheel motorsports event:
    ${JSON.stringify(lapChartData.session_info, null, '    ')}
    
    Create a broadcast style 40 word intro including session information for the event.  Be sure to start with phrases like: "It's lights out and away we go", "We are going green", etc.`;

    let intro = await createCompletion(introPrompt);

    let generatedCommentary = [intro];

    for (let n of notes) {
        let eventPrompt = `We are creating a broadcast style play by play of a wheel to wheel motorsports event using colorful and exciting language.  Note the interesting narratives as race events unfold but note that we don't know where in the track these events happend.
    So far this are some of the last things we have said about the race:
    <race>
    ${generatedCommentary.join('\n')}
    </race>

    The camera just pointed to look at a new car
    
    This is a combination of what has happened to this driver since we last saw them on the broadcast as well as what's happening right now:
    ${JSON.stringify(n.note, null, '    ')}

    Note that events happening while the camera is pointing at them are labeled with "live event" all other events happened while we were looking at other cars.
    
    Generate very succinct commentary in present tense about what just happened.  If there is nothing to say at the moment make a nice comment about the driver or their team and sponsors.  Avoid using the same kind of phrasing multiple times.`;

        let newComment = await createCompletion(eventPrompt);

        generatedCommentary.push(newComment);

        while (generatedCommentary.length > 20) {
            generatedCommentary.shift();
        }

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

        n.note.push(`looking at - ${driverNames[n.lookAt]} lap: ${currentLap}`);

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
                `past event :: lap: ${lap} - looses position to ${
                    driverNames[o.directDriverId]
                }`
            );
        }

        for (let o of pastPositiveMoves) {
            let lap = Math.floor(o.perc);
            n.note.push(
                `past event :: lap: ${lap} - ${driverNames[o.directDriverId]} ${
                    o.actionType
                } ${driverNames[o.indirectDriverId]}`
            );
        }

        for (let o of currentOvertakes) {
            n.note.push(
                `live event :: ${driverNames[o.directDriverId]} ${
                    o.actionType
                } ${driverNames[o.indirectDriverId]}`
            );
        }

        for (let o of currentNegativeMoves) {
            n.note.push(
                `live event :: looses position to ${
                    driverNames[o.directDriverId]
                }`
            );
        }

        driverLastLookAtMap[n.lookAt] = n.time;
    }

    await narrate(notes, lapChartData);
}
