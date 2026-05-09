import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

export default defineEventHandler(async () => {
    const dir = resolve(process.cwd(), 'public/tracks');
    const files = await readdir(dir);
    const ids = new Set<string>();
    for (const name of files) {
        const m = name.match(/^([^._]+)\.jpg$/);
        if (m) ids.add(m[1]);
    }
    return { trackIds: [...ids].sort((a, b) => Number(a) - Number(b)) };
});
