/**
 *
 * This code defines a TypeScript function called wf that takes two parameters: an object (obj) of any type
 * and a string (name). It uses the writeFileSync function from the 'fs' module to write the JSON
 * representation of the provided object into a file located at a specific path within the
 * "./public/data/derived/" directory, using the provided name as the filename.
 *
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';

export function wf(obj: any, name: string) {
    const ids = name.split('.')[0].split('_');
    const path = `./public/data/ldata-rsltsts/${ids.join('/')}/`;
    if (!existsSync(path)) {
        mkdirSync(path, { recursive: true });
    }
    let newName = ids[ids.length - 1];
    if (newName.startsWith('-')) {
        newName = 'n' + newName.slice(1);
    }
    writeFileSync(`${path}${newName}.json`, JSON.stringify(obj));
}
