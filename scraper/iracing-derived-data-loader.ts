import { readFileSync } from 'fs';

import type { SimsessionResults } from '../src/iracing-endpoints';

const MNT_PT = './public/data/derived/';

export function getSimSessionResults(
    subsessionId: number,
    simsessionNumber: number
): SimsessionResults {
    let ret: SimsessionResults = <SimsessionResults>JSON.parse(
        readFileSync(
            `${MNT_PT}simSessionResults_${subsessionId}_${simsessionNumber}.json`,
            {
                encoding: 'utf8',
                flag: 'r',
            }
        )
    );

    return ret;
}
