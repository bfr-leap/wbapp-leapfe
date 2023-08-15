/**
 *
 * This TypeScript module imports the readFileSync function from the 'fs' (file system) module and the
 * SimsessionResults type from an external module 'iracing-endpoints'. It defines a function
 * getSimSessionResults that takes a subsessionId and a simsessionNumber as parameters. This function
 * reads and parses a JSON file named based on the provided ids, located in the './public/data/derived/'
 * directory, and returns the parsed SimsessionResults object.
 *
 */

import { readFileSync } from 'fs';

import type { SimsessionResults } from '../../src/iracing-endpoints';

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
