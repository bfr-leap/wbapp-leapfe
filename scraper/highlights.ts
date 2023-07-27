import {
    getLeagueSeasons,
    getLeagueSeasonSessions,
    getLapChartData,
    getSubsessionTelemetry,
} from './iracing-scraped-data-loader.js';

import { getSimSessionResults } from './iracing-derived-data-loader.js';
import {
    ST_SimsessionTelemetry,
    SimsessionResults,
    LapChartData,
} from '../src/iracing-endpoints.js';
import { createCompletion } from './openai/openai-endpoints.js';

interface ExtendedTelemetry {
    driverId: number;
    lapNumber: number;
    perc: number;
    perdD: number;
    t: number;
}

interface PositionChangeEvent {
    diretDriverId: number;
    indirectDriverId?: number;
    time: number;
    perc: number;
    actionType: string;
    lapNumber: number;
    position: number;
    notes: string[];
    indirectNotes: string[];
}

interface ReplayNote {
    time: number;
    lookAt: number;
    note: string;
}

function clone(obj: any): any {
    return JSON.parse(JSON.stringify(obj));
}

async function getRawReplayNotes(
    subsessionId: number,
    simsessionId: number
): Promise<ReplayNote[]> {
    const lapChartData: LapChartData = getLapChartData(
        subsessionId,
        simsessionId
    );
    const simsessionResults: SimsessionResults = getSimSessionResults(
        subsessionId,
        simsessionId
    );
    const sTelemetry: ST_SimsessionTelemetry = getSubsessionTelemetry(
        subsessionId
    ).find((v) => v.id === simsessionId);

    let tel: ExtendedTelemetry[] = [];

    let driverIdSet: { [key: string]: boolean } = {};

    for (let driver of sTelemetry.drivers) {
        const driverId = driver.id;
        driverIdSet[driverId] = true;
        for (let lap of driver.laps) {
            const lapNumber = lap.lapNumber;
            for (let t of lap.telemetry) {
                const v = clone(t);
                v.driverId = driverId;
                v.lapNumber = lapNumber;
                tel.push(v);
            }
        }
    }

    let totalLaps = Math.max(
        ...simsessionResults.results.map((v) => v.laps_completed)
    );
    let relevantDrivers: number[] = [];
    for (let r of simsessionResults.results) {
        if (r.position <= 12) {
            relevantDrivers.push(r.cust_id);
        }
    }

    let driverNames: { [key: number]: string } = {};
    for (let r of lapChartData.chunk_info) {
        const na = r.display_name.split(' ');
        driverNames[r.cust_id] = r.display_name; // na[na.length - 1].substring(0, 3);
    }

    let driverIds = Object.keys(driverIdSet).map((v) => Number.parseInt(v));

    let telemetryByLap: { [key: number]: ExtendedTelemetry[] } = {};

    for (let t of tel) {
        let k = t.lapNumber * 100 + Math.floor(t.perc * 100);
        let bucket = telemetryByLap[k];
        if (!bucket) {
            bucket = [];
            telemetryByLap[k] = bucket;
        }
        bucket.push(t);
    }

    for (let k in telemetryByLap) {
        telemetryByLap[k].sort((a, b) => a.t - b.t);
    }

    let keys = Object.keys(telemetryByLap)
        .map((v) => Number.parseInt(v))
        .sort((a, b) => a - b);

    let last: ExtendedTelemetry[] = telemetryByLap[keys[0]];
    let next: ExtendedTelemetry[] = telemetryByLap[keys[1]];

    let events: PositionChangeEvent[] = [];

    for (let i = 1; i < keys.length; i++) {
        last = telemetryByLap[keys[i - 1]];
        next = telemetryByLap[keys[i]];

        events.push(
            ...checkOvertake(
                last,
                next,
                relevantDrivers,
                totalLaps,
                driverNames
            )
        );
    }

    addNotes(lapChartData, events);

    events = filterPitStops(events);

    events = detectIncidents(events);

    events = filterEarlyChaos(events);

    let notes = getReplayNotes(events, driverNames);

    return notes;
}

function getReplayNotes(
    events: PositionChangeEvent[],
    driverNames: { [key: number]: string }
): ReplayNote[] {
    return events.map((ev) => {
        if (ev.actionType === 'overtake') {
            let directModifier = '';
            let indirectModifier = '';

            if (ev.notes.length > 0) {
                if (ev.notes.indexOf('contact') > -1) {
                    directModifier = ' make contact with and ';
                }
            }

            if (ev.indirectNotes.length > 0) {
                if (ev.indirectNotes.indexOf('off track') > -1) {
                    indirectModifier = ' as they have a moment';
                }
            }

            return {
                time: ev.time,
                lookAt: ev.diretDriverId,
                note: `lap ${ev.lapNumber} - ${
                    driverNames[ev.diretDriverId]
                }${directModifier} overtakes ${
                    driverNames[ev.indirectDriverId]
                }${indirectModifier} for p${ev.position}`,
            };
        } else if (ev.actionType === 'incident') {
            let incidentMap: { [key: string]: boolean } = {};
            for (let n of ev.notes) {
                if (n !== 'invalid') {
                    incidentMap[n] = true;
                }
            }

            return {
                time: ev.time,
                lookAt: ev.diretDriverId,
                note: `lap ${ev.lapNumber} - ${
                    driverNames[ev.diretDriverId]
                } looses several positions: ${Object.keys(incidentMap).join(
                    ', '
                )}`,
            };
        }

        return {
            time: ev.time,
            lookAt: ev.diretDriverId,
            note: `${ev.diretDriverId} ${ev.actionType} ${ev.indirectDriverId}`,
        };
    });
}

function filterEarlyChaos(
    events: PositionChangeEvent[]
): PositionChangeEvent[] {
    return events.filter((v) => v.lapNumber > 1 || v.perc > 0.5);
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
                diretDriverId: events[i].indirectDriverId,
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
            (v) => v.cust_id === e.diretDriverId && v.lap_number === e.lapNumber
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

function filterPitStops(events: PositionChangeEvent[]): PositionChangeEvent[] {
    return events.filter(
        (v) =>
            v.notes.indexOf('pitted') < 0 &&
            v.indirectNotes.indexOf('pitted') < 0
    );
}

function checkOvertake(
    last: ExtendedTelemetry[],
    next: ExtendedTelemetry[],
    relevantDrivers: number[],
    totalLaps: number,
    driverNames: { [key: number]: string }
): PositionChangeEvent[] {
    const ret: PositionChangeEvent[] = [];

    let c = Math.min(last.length, next.length);

    let hasChanges: boolean = false;

    const seenNewDrivers: number[] = [];
    const seenLastDrivers: number[] = [];

    for (let i = 0; i < c; i++) {
        let l = last[i];
        let n = next[i];

        seenNewDrivers.push(n.driverId);
        seenLastDrivers.push(l.driverId);

        if (
            seenLastDrivers.indexOf(n.driverId) < 0 &&
            n.lapNumber <= totalLaps &&
            l.lapNumber > 0
        ) {
            let passedCar = -1;
            for (let ld of seenLastDrivers) {
                if (
                    seenNewDrivers.indexOf(ld) < 0 &&
                    relevantDrivers.indexOf(ld) >= 0
                ) {
                    passedCar = ld;
                    break;
                }
            }

            if (
                relevantDrivers.indexOf(n.driverId) >= 0 &&
                relevantDrivers.indexOf(passedCar) >= 0
            ) {
                ret.push({
                    diretDriverId: n.driverId,
                    indirectDriverId: passedCar,
                    time: n.t,
                    perc: n.perc,
                    actionType: 'overtake',
                    lapNumber: n.lapNumber,
                    position: i + 1,
                    notes: [],
                    indirectNotes: [],
                });

                hasChanges = true;
            }
        }
    }

    return ret;
}

async function main() {
    const subsessionId = 62630734;
    const simsessionId = -3;

    let notes = await getRawReplayNotes(subsessionId, simsessionId);

    console.log(JSON.stringify(notes, null, '    '));

    const lapChartData = getLapChartData(subsessionId, simsessionId);

    let sessionInfo = {
        event_type_name: lapChartData.session_info.event_type_name,
        //season_name: fileContents.session_info.season_name,
        session_name: lapChartData.session_info.session_name,
        simsession_name: lapChartData.session_info.simsession_name,
        start_time: lapChartData.session_info.start_time,
        track: lapChartData.session_info.track,
    };

    let introPrompt = `The following is session information for a wheel to wheel motorsports event:
    ${JSON.stringify(sessionInfo, null, '    ')}
    
    Create a broadcast style 40 word intro including session information for the event.  Be sure to start with phrases like: "It's lights out and away we go", "We are going green", etc.`;

    let generatedCommentary = await createCompletion(introPrompt);

    for (let i = 0; i < notes.length && generatedCommentary !== 'error'; ++i) {
        let eventPrompt = `We are creating a broadcast style play by play of a wheel to wheel motorsports event using colorful and exciting language.  Note the interesting narratives as race events unfold but note that we don't know where in the track these events happend.
    So far this is what has happened during the race:
    <race>
    ${generatedCommentary}
    </race>
    
    This is what just happened:
    ${notes[i].note}
    
    Generate very succinct comentary in present tense about what just happened.`;

        let newComment = await createCompletion(eventPrompt);

        notes[i].note = newComment;

        generatedCommentary += '\n' + newComment;

        if (newComment === 'error') {
            console.log('exiting after generation error');
            break;
        }
    }

    // tel = tel.filter((v) => v.driverId === 115698);
    console.log(JSON.stringify(notes, null, '    '));
}

main();
