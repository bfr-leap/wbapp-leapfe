#!/usr/bin/env node
/**
 * Regenerate server/utils/og-fonts-data.ts from the WOFF2 source files
 * in server/assets/. Run this if you ever swap or update the bundled
 * Inter weights.
 *
 * Usage:
 *   node scripts/build-og-fonts.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const weights = [400, 600, 700];
const out = [
    '/**',
    ' * Inter font weights, base64-inlined.',
    ' *',
    ' * Generated from server/assets/og-font-{400,600,700}.woff2. Inlining',
    ' * avoids the Nitro-on-Vercel pitfall where binary server/assets are not',
    ' * reliably bundled into the deployed function — the production build',
    ' * then returns null from useStorage(...).getItemRaw() and resvg falls',
    ' * through to a fontless render (shapes only, no glyphs).',
    ' *',
    ' * Regenerate by running scripts/build-og-fonts.mjs after replacing the',
    ' * source WOFF2 files.',
    ' */',
    '',
];

const ids = [];
for (const w of weights) {
    const filename = `og-font-${w}.woff2`;
    const buf = readFileSync(resolve(repoRoot, 'server/assets', filename));
    const id = `OG_FONT_${w}`;
    out.push(`// ${filename} (${buf.length} bytes raw)`);
    out.push(`const ${id}_B64 =`);
    const b64 = buf.toString('base64');
    for (let j = 0; j < b64.length; j += 76) {
        const chunk = b64.slice(j, j + 76);
        const last = j + 76 >= b64.length;
        out.push('    "' + chunk + '"' + (last ? ';' : ' +'));
    }
    out.push('');
    ids.push(id);
}

out.push('export const OG_FONT_BUFFERS: Buffer[] = [');
for (const id of ids) {
    out.push(`    Buffer.from(${id}_B64, "base64"),`);
}
out.push('];');
out.push('');

const target = resolve(repoRoot, 'server/utils/og-fonts-data.ts');
writeFileSync(target, out.join('\n'));
console.log(`${target}: ${out.join('\n').length} bytes`);
