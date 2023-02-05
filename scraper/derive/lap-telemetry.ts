import { readFileSync } from 'fs';

const MNT_PT = './public/data/scraped/telemetry/';

export function deriveLapTelemetry(subssesionId: number) {
    let telem = JSON.parse(
        readFileSync(`${MNT_PT}${subssesionId}.json`, {
            encoding: 'utf8',
            flag: 'r',
        })
    );

    for (let simsession of telem) {
        if (simsession.id === -4) {
            for (let driver of simsession.drivers) {
                // if (driver.id === 732815) {
                // if (driver.id === 601143) {
                if (driver.id === 115698) {
                    let pLap = null;
                    for (let lap of driver.laps) {
                        if (pLap) {
                            let startT = pLap.telemetry[0].t;
                            let endT = lap.telemetry[0].t;

                            console.log(
                                `lap: ${pLap.lapNumber} :: ${
                                    (endT - startT) / 60
                                } :: ${pLap.telemetry.length}`
                            );
                        }

                        pLap = lap;
                    }
                }
            }
        }
    }
}
