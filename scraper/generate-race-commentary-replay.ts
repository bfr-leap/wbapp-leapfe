/**
 *
 * This code is a JavaScript file that orchestrates various functions to analyze telemetry data from an
 * iRacing simulation session. It imports functions for reconstructing telemetry, loading lap chart data,
 * session results, overtaking detection, camera direction, and note generation. The main() function utilizes
 * these imported functions to process the telemetry data, detect overtakes, generate camera scripts, and
 * create note text based on the simulation session. The final output includes formatted camera scripts and
 * related information.
 *
 */

import { reconstructEpochTelemetry } from './telemetry/epoch-reconstruction.js';
import { getLapChartData } from './iracing/iracing-scraped-data-loader.js';
import { getSimSessionResults } from './iracing/iracing-derived-data-loader.js';
import { LapChartData, SimsessionResults } from '../src/iracing-endpoints.js';
import { createCompletion } from './openai/openai-endpoints.js';
import { detectOvertakes } from './telemetry/overtake-detection.js';
import { getCameraScript } from './telemetry/camera-direction.js';
import { generateNoteText } from './telemetry/note-generation.js';

async function main() {
    const subsessionId = 62630734;
    const simsessionId = -3;

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

    let overtakes = detectOvertakes(telemetry, driverNames);
    // console.log('number of events: ', overtakes.length);
    // console.log(JSON.stringify(overtakes, null, '    '));

    let camScript = getCameraScript(telemetry, overtakes);
    // console.log(camScript.length);
    // console.log(JSON.stringify(camScript, null, '    '));

    await generateNoteText(
        camScript,
        overtakes,
        lapChartData,
        telemetry,
        driverNames,
        simsessionResults
    );

    console.log('\n\n\n\n');

    console.log(JSON.stringify(camScript, null, '    '));

    // let sign = 1;
    // console.log(camScript.length);
    // for (let s of camScript) {
    //     console.log(s.time * sign);
    //     console.log(s.lookAt);
    //     sign = -1;
    // }
}

main();
