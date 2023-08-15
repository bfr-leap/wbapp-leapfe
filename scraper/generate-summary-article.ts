/**
 *
 * This JavaScript file imports functions related to iRacing data loading and processing. It defines an
 * async function named chat that uses the OpenAI API to generate text completions based on a given prompt.
 * The code also includes functions to process simulation session data, extract relevant lap and result
 * information, and create a summary of the racing event.
 *
 */

import { Configuration, OpenAIApi } from 'openai';
import {
    getLeagueSeasons,
    getLeagueSeasonSessions,
    getLapChartData,
} from './iracing/iracing-scraped-data-loader.js';

import { getSimSessionResults } from './iracing/iracing-derived-data-loader.js';

async function chat(prompt: string) {
    const configuration = new Configuration({
        apiKey: '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',
    });
    const openai = new OpenAIApi(configuration);

    try {
        const response = await openai.createCompletion({
            model: 'text-davinci-003',
            prompt: prompt,
            temperature: 0.9,
            max_tokens: 804,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0.6,
            stop: [' Human:', ' AI:'],
        });

        console.log(JSON.stringify(response.data, null, '    '));

        console.log((<any>response.data.choices).text);
    } catch (error) {
        console.log(JSON.stringify(error, null, '    '));
    }

    console.log(
        'done ========================================\n========================================\n========================================\n========================================\n'
    );
}

function place(n: number): string {
    if (n === 1) return '1st';
    if (n === 2) return '2nd';
    if (n === 3) return '3rd';
    return `${n}th`;
}

function simsessionPrompt() {
    const fileContents = getLapChartData(62630734, -3);
    const results = getSimSessionResults(62630734, -3);

    let simplifiedChunks = fileContents.chunk_info.map((chunk) => {
        let ret: any = {
            car_number: chunk.car_number,
            lap_number: chunk.lap_number,
            // lap_time: chunk.lap_time / 10000,
            session_time: chunk.session_time / 10000,
            lap_position: chunk.lap_position,
        };

        if (chunk.lap_events.length > 0) {
            ret.lap_events = chunk.lap_events;
        }

        return ret;
    });

    // simplifiedChunks = simplifiedChunks.filter(
    //     (chunk) => chunk.lap_number < 12
    // );

    const ignoredLapEvents = ['off track', 'invalid', 'discontinuity'];
    const positionById: { [key: number]: number } = {};

    const finalPositionById: { [key: number]: number } = {};

    let keyEvents: string[] = [];
    let topN = 10;
    let pushKeyEvent = (custId: number, ev: string) => {
        if (finalPositionById[custId] <= topN) {
            keyEvents.push(ev);
        }
    };

    let totalLaps = results.results[0].laps_completed;

    for (let result of results.results) {
        finalPositionById[result.cust_id] = result.position;
    }

    for (let chunk of fileContents.chunk_info) {
        if (chunk.lap_events.length > 0) {
            for (let event of chunk.lap_events) {
                if (ignoredLapEvents.includes(event)) continue;

                pushKeyEvent(
                    chunk.cust_id,
                    `Lap ${chunk.lap_number} - ${chunk.display_name} :: ${event}`
                );
            }
        }

        if (chunk.lap_number === 0 && chunk.lap_position === 1) {
            pushKeyEvent(
                chunk.cust_id,
                `Lap ${chunk.lap_number} - ${chunk.display_name} :: starts from pole position`
            );
        }

        if (chunk.lap_number === 1) {
            positionById[chunk.cust_id] = chunk.lap_position;
            if (chunk.lap_position === 1) {
                pushKeyEvent(
                    chunk.cust_id,
                    `Lap ${chunk.lap_number} - ${chunk.display_name} :: leads the first lap`
                );
            } else {
                pushKeyEvent(
                    chunk.cust_id,
                    `Lap ${chunk.lap_number} - ${chunk.display_name} :: ${place(
                        chunk.lap_position
                    )} place`
                );
            }
        } else if (chunk.lap_number === totalLaps) {
            if (chunk.lap_position === 1) {
                pushKeyEvent(
                    chunk.cust_id,
                    `Lap ${chunk.lap_number} - ${chunk.display_name} :: wins the race`
                );
            } else {
                pushKeyEvent(
                    chunk.cust_id,
                    `Lap ${chunk.lap_number} - ${
                        chunk.display_name
                    } :: finishes ${place(chunk.lap_position)} place`
                );
            }
        } else {
            if (
                chunk.lap_position !== positionById[chunk.cust_id] &&
                chunk.lap_number > 0
            ) {
                pushKeyEvent(
                    chunk.cust_id,
                    `Lap ${chunk.lap_number} - ${
                        chunk.display_name
                    } :: start ${place(
                        positionById[chunk.cust_id]
                    )} finish ${place(chunk.lap_position)}`
                );
            }
            positionById[chunk.cust_id] = chunk.lap_position;
        }
    }

    let sessionInfo = {
        event_type_name: fileContents.session_info.event_type_name,
        //season_name: fileContents.session_info.season_name,
        session_name: fileContents.session_info.session_name,
        simsession_name: fileContents.session_info.simsession_name,
        start_time: fileContents.session_info.start_time,
        track: fileContents.session_info.track,
    };

    return (
        // JSON.stringify(keyEvents, null, '    ') +
        // '\n\n' +
        // JSON.stringify(results, null, '    ') +
        // '\n\n' +
        'The following is session info for a wheel to wheel motosports event:\n' +
        JSON.stringify(sessionInfo, null, '    ') +
        '\n\nThe following is lap by lap key events from the same motosports race:\n' +
        JSON.stringify(keyEvents, null, '    ') +
        '\n\nBroadcast style summaries start with an introduction about the venue and event.  ' +
        'They continue by summarizing interesting events and position changes.  ' +
        'Do not include lap times.  ' +
        'The report for the first lap should contain the place order for the first 10 cars.  ' +
        'The key aim for the report is to entretain so make sure to use colorful and exciting language.  ' +
        'Be sure to comment on pit strategy and any incidents that occur.  ' +
        'Position changes need to be reported on a per lap basis. Keep in mind that track position is more important than single lap time. ' +
        'The following is a broadcast style summary of what happened during the race:\n'
    );
}

console.log(simsessionPrompt());

// make it more interesting by weaving interesting narratives:
// chat(simsessionPrompt());

// chat(
//     'You: How do I combine arrays?\nJavaScript chatbot: You can use the concat() method.\nYou: How do you make an alert appear after 10 seconds?\nJavaScript chatbot'
// );
