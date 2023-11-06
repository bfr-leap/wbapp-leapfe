import { reconstructEpochTelemetry } from './telemetry/epoch-reconstruction.js';
import { getLapChartData } from './iracing/iracing-scraped-data-loader.js';
import { LapChartData } from '../src/iracing-endpoints.js';

import { getSubsessionTelemetry } from './iracing/iracing-scraped-data-loader.js';

async function trackPByEpochCSV(subsessionId, simsessionId, driverNames) {
    let telemetry = await reconstructEpochTelemetry(
        subsessionId,
        simsessionId,
        driverNames
    );

    for (let epoch of telemetry.epochList) {
        let row = '';
        row += epoch.time + ',';
        epoch.data.sort((a, b) => a.driverId - b.driverId);
        for (let d of epoch.data) {
            row += d.driverId + ',' + d.perc + ',';
        }
        console.log(row);
    }
}

async function rawTelem(subsessionId, simsessionId) {
    const sTelemetry = getSubsessionTelemetry(subsessionId).find(
        (v) => v.id === simsessionId
    );

    let driver = sTelemetry.drivers[1];
    for (let lap of driver.laps) {
        for (let t of lap.telemetry) {
            console.log(`${t.t},${t.perc + lap.lapNumber - 1}`);
        }
    }
}

async function main() {
    let subsessionId: number = 64600487;
    //  64464945
    let simsessionId: number = 0;

    const lapChartData: LapChartData = getLapChartData(
        subsessionId,
        simsessionId
    );

    let driverNames: { [key: number]: string } = {};
    for (let r of lapChartData.chunk_info) {
        const na = r.display_name.split(' ');
        driverNames[r.cust_id] = r.display_name; // na[na.length - 1].substring(0, 3);
    }

    trackPByEpochCSV(subsessionId, simsessionId, driverNames);

    // rawTelem(subsessionId, simsessionId);
}

main();
