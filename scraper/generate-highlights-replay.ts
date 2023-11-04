/**
 *
 * This file contains TypeScript code that processes telemetry and race data from iRacing simulations.
 * It defines functions to analyze race events such as overtakes, incidents, and pit stops, and generates
 * detailed commentary for a motorsports broadcast-style description of the race. The code extracts
 * telemetry, lap data, and session information, then combines them to produce engaging narrative
 * descriptions of race events, enhancing the viewing experience for the audience.
 *
 */

import {
    getLeagueSeasons,
    getLeagueSeasonSessions,
    getLapChartData,
    getSubsessionTelemetry,
} from './iracing/iracing-scraped-data-loader.js';

import { getSimSessionResults } from './iracing/iracing-derived-data-loader.js';
import { SimsessionResults, LapChartData } from '../src/iracing-endpoints.js';
import type {
    EpochTelemetry,
    ReplayNote,
    PositionChangeEvent,
} from './telemetry/telemetry-types.js';
import { createCompletion } from './openai/openai-endpoints.js';
import { detectOvertakes } from './telemetry/overtake-detection.js';
import { reconstructEpochTelemetry } from './telemetry/epoch-reconstruction.js';

import {
    overtakeComments,
    crashComments,
    getFinishingCommentTemplates,
} from './telemetry/narrative-comments.js';

let _overtakeComments = JSON.parse(JSON.stringify(overtakeComments));
let _crashComments = JSON.parse(JSON.stringify(crashComments));
let _finishingCommentTemplates = getFinishingCommentTemplates();

function getFinishingNotes(
    tel: EpochTelemetry,
    simsessionResults: SimsessionResults
): PositionChangeEvent[] {
    let nextP = 1;
    let finishedSet = new Set<number>();
    let ret: PositionChangeEvent[] = [];

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
                ret.push({
                    time: c.time,
                    directDriverId: id,
                    actionType: 'finished',
                    position: simsessionResults.results.find(
                        (r) => r.cust_id === id
                    ).position,
                    notes: ['finished'],
                    perc: percA,
                    lapNumber: Math.floor(percA),
                    indirectNotes: [],
                });
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

async function getRawReplayNotes(
    subsessionId: number,
    simsessionId: number
): Promise<ReplayNote[]> {
    const lapChartData: LapChartData = getLapChartData(
        subsessionId,
        simsessionId
    );

    let driverNames: { [key: number]: string } = {};
    for (let r of lapChartData.chunk_info) {
        const na = r.display_name.split(' ');
        driverNames[r.cust_id] = r.display_name; // na[na.length - 1].substring(0, 3);
    }

    let telemetry = await reconstructEpochTelemetry(
        subsessionId,
        simsessionId,
        driverNames
    );

    const simsessionResults: SimsessionResults = getSimSessionResults(
        subsessionId,
        simsessionId
    );

    let events: PositionChangeEvent[] = detectOvertakes(telemetry, driverNames);

    events = filterPostRaceEvents(events, simsessionResults);

    addNotes(lapChartData, events);

    events = filterPitStops(events);

    events = detectIncidents(events);

    events = filterEarlyChaos(events);

    let finishE = getFinishingNotes(telemetry, simsessionResults);

    for (let f of finishE) {
        events.push(f);
    }

    // events = limitEventCount(
    //     events,
    //     (8 * 60) / 3 /** 160 */, // 8 min video
    //     simsessionResults
    // );

    let notes = getReplayNotes(events, driverNames);

    return notes;
}

function filterPostRaceEvents(
    events: PositionChangeEvent[],
    simsessionResults: SimsessionResults
): PositionChangeEvent[] {
    let totalLaps = Math.max(
        ...simsessionResults.results.map((v) => v.laps_completed)
    );

    return events.filter((v) => v.lapNumber < totalLaps);
}

function filterPitStops(events: PositionChangeEvent[]): PositionChangeEvent[] {
    return events.filter(
        (v) =>
            v.notes.indexOf('pitted') < 0 &&
            v.indirectNotes.indexOf('pitted') < 0
    );
}

function limitEventCount(
    events: PositionChangeEvent[],
    maxEventCount: number,
    simsessionResults: SimsessionResults
): PositionChangeEvent[] {
    if (events.length <= maxEventCount) {
        return events;
    }

    let lBound = 1;
    let uBound = simsessionResults.results.length;
    let done: boolean = false;

    let ret: PositionChangeEvent[] = [];

    while (!done) {
        let mid = Math.floor((lBound + uBound) / 2);

        console.log(mid);

        let relevantDrivers: number[] = [];
        for (let r of simsessionResults.results) {
            if (r.position <= mid) {
                relevantDrivers.push(r.cust_id);
            }
        }

        ret = events.filter(
            (v) =>
                relevantDrivers.indexOf(v.indirectDriverId) >= 0 ||
                relevantDrivers.indexOf(v.directDriverId) >= 0
        );

        if (ret.length === maxEventCount) {
            done = true;
        } else if (mid === uBound - 1) {
            done = true;
        } else if (ret.length > maxEventCount) {
            uBound = mid;
        } else {
            lBound = mid;
        }
    }

    return ret;
}

function getReplayNotes(
    events: PositionChangeEvent[],
    driverNames: { [key: number]: string }
): ReplayNote[] {
    return events.map((ev) => {
        if (ev.actionType === 'overtakes') {
            let directModifier = '';
            let indirectModifier = '';

            if (ev.notes.length > 0) {
                if (ev.notes.indexOf('contact') > -1) {
                    directModifier = ' make contact with and ';
                }
            }

            if (ev.indirectNotes.length > 0) {
                let and = '';
                if (ev.indirectNotes.indexOf('off track') > -1) {
                    indirectModifier = ' has an off track moment';
                    and = ' and';
                }

                if (ev.indirectNotes.indexOf('pitted') > -1) {
                    indirectModifier += and + ' makes a pit stop';
                }

                indirectModifier = `${
                    driverNames[ev.indirectDriverId]
                }${indirectModifier}. `;
            }

            let randomCommentIndex = Math.floor(
                Math.random() * (_overtakeComments.length - 1)
            );
            let spicyComment = _overtakeComments[randomCommentIndex];
            _overtakeComments.splice(randomCommentIndex, 1);

            return {
                time: ev.time,
                lookAt: ev.directDriverId,
                note: [
                    `lap ${ev.lapNumber + 1} - ${
                        indirectModifier.length > 0 ? indirectModifier : ''
                    }${
                        driverNames[ev.directDriverId]
                    }${directModifier} overtakes ${
                        driverNames[ev.indirectDriverId]
                    } for p${ev.position}`,
                    spicyComment,
                ],
            };
        } else if (ev.actionType === 'incident') {
            let incidentMap: { [key: string]: boolean } = {};
            for (let n of ev.notes) {
                if (n !== 'invalid') {
                    incidentMap[n] = true;
                }
            }

            let _crashComments = JSON.parse(JSON.stringify(crashComments));

            let randomCommentIndex = Math.floor(
                Math.random() * (_crashComments.length - 1)
            );
            let spicyComment = _crashComments[randomCommentIndex];
            _crashComments.splice(randomCommentIndex, 1);

            return {
                time: ev.time,
                lookAt: ev.directDriverId,
                note: [
                    `lap ${ev.lapNumber + 1} - ${
                        driverNames[ev.directDriverId]
                    } looses several positions: ${Object.keys(incidentMap).join(
                        ', '
                    )}`,
                    spicyComment,
                ],
            };
        } else if (ev.actionType === 'finished') {
            let randomCommentIndex = Math.floor(
                Math.random() * (_finishingCommentTemplates.length - 1)
            );
            let templateFn = _finishingCommentTemplates[randomCommentIndex];
            let spicyComment = templateFn(
                driverNames[ev.directDriverId],
                ev.position
            );
            _finishingCommentTemplates.splice(randomCommentIndex, 1);

            return {
                time: ev.time,
                lookAt: ev.directDriverId,
                note: [
                    `lap ${ev.lapNumber + 1} - ${
                        driverNames[ev.directDriverId]
                    } finishes in p${ev.position}`,
                    spicyComment,
                ],
            };
        }
        return {
            time: ev.time,
            lookAt: ev.directDriverId,
            note: [
                `${ev.directDriverId} ${ev.actionType} ${ev.indirectDriverId}`,
            ],
        };
    });
}

function filterEarlyChaos(
    events: PositionChangeEvent[]
): PositionChangeEvent[] {
    // return events.filter((v) => v.lapNumber > 1);
    return events;
}

function detectIncidents(events: PositionChangeEvent[]): PositionChangeEvent[] {
    let ret: PositionChangeEvent[] = [];

    let c = events.length;

    for (let i = 0; i < c; ++i) {
        let e = i + 1;
        let indirect = events[i].indirectDriverId;
        let notes: string[] = [];
        while (e < c && events[e].indirectDriverId === indirect) {
            notes.push(...events[e].indirectNotes);
            ++e;
        }

        if (e === i + 1) {
            ret.push(events[i]);
        } else {
            ret.push({
                directDriverId: events[i].indirectDriverId,
                time: events[i].time,
                perc: events[i].perc,
                actionType: 'incident',
                lapNumber: events[i].lapNumber,
                position: events[e - 1].position + 1,
                notes: notes,
                indirectNotes: [],
            });

            i = e - 1;
        }
    }

    return ret;
}

function addNotes(lapChartData: LapChartData, events: PositionChangeEvent[]) {
    for (let e of events) {
        let lap = lapChartData.chunk_info.find(
            (v) =>
                v.cust_id === e.directDriverId && v.lap_number === e.lapNumber
        );
        if (lap) {
            e.notes.push(...lap.lap_events);
        }

        lap = lapChartData.chunk_info.find(
            (v) =>
                v.cust_id === e.indirectDriverId && v.lap_number === e.lapNumber
        );
        if (lap && lap.lap_events.length > 0) {
            e.indirectNotes.push(...lap.lap_events);
        }
    }
}

async function main() {
    const subsessionId = 64316518;
    const simsessionId = -3;

    let notes = await getRawReplayNotes(subsessionId, simsessionId);

    console.log(JSON.stringify(notes, null, '    '));

    // console.log((notes.length * 3) / 60, notes.length);

    // const lapChartData = getLapChartData(subsessionId, simsessionId);

    // let sessionInfo = {
    //     event_type_name: lapChartData.session_info.event_type_name,
    //     //season_name: fileContents.session_info.season_name,
    //     session_name: lapChartData.session_info.session_name,
    //     simsession_name: lapChartData.session_info.simsession_name,
    //     start_time: lapChartData.session_info.start_time,
    //     track: lapChartData.session_info.track,
    // };

    // let introPrompt = `The following is session information for a wheel to wheel motorsports event:
    // ${JSON.stringify(sessionInfo, null, '    ')}

    // Create a broadcast style 40 word poetic prose intro including session information for the event in the style of Jeremy Clarkson.`;

    // let intro = await createCompletion(introPrompt);

    // for (let i = 0; i < notes.length && intro !== 'error'; ++i) {
    //     let eventPrompt = `Combine the followiong 2 sentences into 1 keeping it in present tense:
    // ${notes[i].note[notes[i].note.length - 2]}
    // ${notes[i].note[notes[i].note.length - 1]} `;

    //     let newComment = await createCompletion(eventPrompt);

    //     notes[i].note.push(newComment);

    //     if (newComment === 'error') {
    //         console.log('exiting after generation error');
    //         break;
    //     }
    // }

    // (<any>notes[0]).intro = intro;

    // // tel = tel.filter((v) => v.driverId === 115698);
    // console.log(JSON.stringify(notes, null, '    '));
}

main();
