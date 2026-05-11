// SSR smoke tests — fixture-backed renders of every shareable URL.
//
// Companion to `ssr-smoke.test.ts`. Same shareable URLs, same
// "render must not 500 and must carry og:image" assertions; the
// difference is what's behind `/api/fetch-document`:
//
//  - `ssr-smoke.test.ts`           — broker disabled, every fetch
//    returns `{ doc: null }`. Stresses the "broker says nothing"
//    code paths (anonymous SSR, broker timeout, unauthenticated).
//
//  - `ssr-smoke-fixtures.test.ts`  — broker replays recorded fixtures
//    from `tests/fixtures/broker/`. Stresses the "broker actually
//    returned data" code paths. Missing fixtures intentionally throw,
//    which surfaces "page started making a new broker call we didn't
//    record" as a clear test failure.
//
// The fixture set lives in `tests/fixtures/broker/`. To capture a
// new one, sign in to a deployed preview, visit `/capture-broker`,
// copy the JSON blob, and pipe it into
// `scripts/import-broker-fixtures.mjs` to drop per-tuple files into
// the fixtures dir.
//
// This file is gated behind `LEAP_SMOKE=1` (only `npm run test:smoke`
// runs it). If the fixture corpus isn't checked in yet, the whole
// describe block skips so the harness can land before the data does.

import { describe, it, beforeAll, afterAll } from 'vitest';
import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    bootSmokeServer,
    SMOKE_URLS,
    assertRenders,
    type SmokeServerHandle,
} from './_smoke-helpers';

const PORT = 4568;
const FIXTURE_DIR = resolve(__dirname, 'fixtures/broker');

// If the fixture corpus isn't checked in yet (early in this branch's
// life), skip the whole describe block instead of failing. The other
// smoke pass still runs in `ssr-smoke.test.ts`.
const hasFixtures =
    existsSync(FIXTURE_DIR) &&
    readdirSync(FIXTURE_DIR).some((f) => f.endsWith('.json'));

const describeMaybe = hasFixtures ? describe : describe.skip;

let handle: SmokeServerHandle | null = null;

beforeAll(async () => {
    if (!hasFixtures) return;
    handle = await bootSmokeServer({
        port: PORT,
        env: {
            // Replay-mode: every `/api/fetch-document` call resolves
            // from disk. A request that doesn't have a matching
            // fixture throws inside the handler, surfaces as a 5xx,
            // and `assertRenders` fails the test loud and clear.
            LEAP_BROKER_FIXTURES: FIXTURE_DIR,
        },
    });
}, 120_000);

afterAll(() => {
    handle?.kill();
    handle = null;
});

describeMaybe(
    'SSR smoke (fixtures) — recorded broker responses should render cleanly',
    () => {
        for (const { label, url } of SMOKE_URLS) {
            it(`renders ${label} (${url})`, async () => {
                if (!handle) throw new Error('smoke server not booted');
                await assertRenders(handle.base, url, handle.stderrBuf);
            }, 30_000);
        }
    }
);
