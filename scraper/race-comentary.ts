import { reconstructEpochTelemetry } from './telemetry/epoch-reconstruction.js';
import { getLapChartData } from './iracing-scraped-data-loader.js';
import { getSimSessionResults } from './iracing-derived-data-loader.js';
import { LapChartData } from '../src/iracing-endpoints.js';
import { createCompletion } from './openai/openai-endpoints.js';
import { detectOvertakes } from './telemetry/overtake-detection.js';
import { getCameraScript } from './telemetry/camera-direction.js';

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

    let overtakes = detectOvertakes(telemetry, driverNames);
    // console.log('number of events: ', overtakes.length);
    // console.log(JSON.stringify(overtakes, null, '    '));

    let camScript = getCameraScript(telemetry);
    console.log(camScript.length);
    console.log(JSON.stringify(camScript, null, '    '));
}

main();
