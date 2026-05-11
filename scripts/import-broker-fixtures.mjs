#!/usr/bin/env node
/**
 * Read a JSON blob (from the `/capture-broker` page) on stdin and
 * write each entry to `tests/fixtures/broker/<key>.json`. Same
 * filename scheme `/api/fetch-document`'s replay mode looks for, so
 * the resulting files are picked up by `LEAP_BROKER_FIXTURES=...`.
 *
 * Usage:
 *   pbpaste | node scripts/import-broker-fixtures.mjs
 *   # or
 *   node scripts/import-broker-fixtures.mjs < capture.json
 */

import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(__dirname, '../tests/fixtures/broker');

function fixtureKey(query) {
    const namespace = String(query.namespace ?? '');
    const type = String(query.type ?? '');
    const filtered = {};
    for (const [k, v] of Object.entries(query)) {
        if (k === 'namespace' || k === 'userID' || k === '_authHeader')
            continue;
        if (v == null || v === '') continue;
        filtered[k] = String(v);
    }
    const keys = Object.keys(filtered).sort();
    const canon = keys.map((k) => `${k}=${filtered[k]}`).join('&');
    const hash = createHash('sha1').update(canon).digest('hex').slice(0, 10);
    const slug = `${namespace}__${type}__${hash}`;
    return slug.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function readStdin() {
    return new Promise((resolve, reject) => {
        let data = '';
        process.stdin.setEncoding('utf-8');
        process.stdin.on('data', (chunk) => (data += chunk));
        process.stdin.on('end', () => resolve(data));
        process.stdin.on('error', reject);
    });
}

const raw = await readStdin();
if (!raw.trim()) {
    console.error(
        'No input on stdin. Pipe in the JSON blob from /capture-broker.'
    );
    process.exit(1);
}

let payload;
try {
    payload = JSON.parse(raw);
} catch (e) {
    console.error('Failed to parse stdin as JSON:', e.message);
    process.exit(1);
}

if (!payload?.entries || !Array.isArray(payload.entries)) {
    console.error(
        'Expected `{ entries: [{ query, doc }, ...] }`. Got: ' +
            JSON.stringify(payload).slice(0, 200)
    );
    process.exit(1);
}

mkdirSync(fixturesDir, { recursive: true });
let written = 0;
for (const entry of payload.entries) {
    if (!entry?.query) {
        console.warn('Skipping entry with no query:', entry);
        continue;
    }
    const key = fixtureKey(entry.query);
    const path = resolve(fixturesDir, `${key}.json`);
    writeFileSync(path, JSON.stringify(entry.doc, null, 2) + '\n');
    console.log(
        `✓ ${key}.json  (${entry.query.namespace}/${entry.query.type})`
    );
    written++;
}

console.log(`\nWrote ${written} fixture(s) to ${fixturesDir}`);
if (payload.recordedAt) {
    console.log(`Source capture recorded at ${payload.recordedAt}`);
}
