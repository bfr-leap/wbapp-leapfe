import { writeFileSync } from 'fs';

export function wf(obj: any, name: string) {
    writeFileSync(`./public/data/derived/${name}`, JSON.stringify(obj));
}
