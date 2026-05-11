/**
 * SSR smoke tests — anonymous renders of every shareable URL.
 *
 * Catches the class of bugs that surfaced when we flipped `ssr: true`
 * (the original `userLeaguesState.findIndex is not a function` 500
 * being the canonical example): code paths that worked client-side
 * because the auth token had hydrated, but crash on the SSR pass when
 * the broker hands back null / an error envelope for an anonymous
 * request.
 *
 * Strategy: build the app for production, boot the Nitro server with
 * an unreachable `API_BASE_URL` so all broker fetches fail (which
 * mimics the most adversarial anonymous SSR case — no cached data,
 * every request times out or returns null), then curl the page URLs
 * and assert each one returns a 2xx HTML response with the expected
 * `og:*` meta tags. A 500 means we've shipped a "trust the broker
 * type" bug and the caller didn't guard.
 *
 * `npm test` runs unit first (fast, fails fast), then `nuxt build`,
 * then this smoke pass with `LEAP_SMOKE=1` (which switches the
 * vitest include glob from `src/**` to `tests/**`). Use
 * `npm run test:smoke` to skip the unit pre-pass when iterating on
 * the harness itself.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SMOKE_URLS, assertRenders } from './_smoke-helpers';

const PORT = 4567;
const BASE = `http://127.0.0.1:${PORT}`;

let server: ChildProcess | null = null;
const stdoutBuf: string[] = [];
const stderrBuf: string[] = [];

async function waitForReady(timeoutMs = 60_000): Promise<void> {
    // Probe /api/og-payload rather than /. Page renders pull the
    // broker (which we've made unreachable) and can take 20+ seconds
    // to time out, so a request to / never returns inside our probe
    // window even when the server is fully up. The og-payload
    // endpoint hits the same broker but with a tighter internal
    // timeout, AND we also accept a 5xx as proof of life: the only
    // thing this probe asserts is that the TCP listener is up.
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            const res = await fetch(`${BASE}/api/og-payload?m=__smoke_probe`, {
                signal: AbortSignal.timeout(3_000),
            });
            if (res.status > 0) return;
        } catch {
            // not ready yet
        }
        await new Promise((r) => setTimeout(r, 250));
    }
    throw new Error(
        `SSR smoke server didn't come up within ${timeoutMs}ms\n` +
            `stdout:\n${stdoutBuf.join('').slice(-2000)}\n` +
            `stderr:\n${stderrBuf.join('').slice(-2000)}`
    );
}

beforeAll(async () => {
    const outputEntry = resolve(__dirname, '../.output/server/index.mjs');
    if (!existsSync(outputEntry)) {
        throw new Error(
            `Missing .output/server/index.mjs — run \`npm run build\` first ` +
                `(or use \`npm run test:smoke\`, which builds for you).`
        );
    }

    // A throwaway Clerk publishable key with a valid base64 inner so
    // Clerk's frontend SDK doesn't crash at boot. The broker fetch is
    // pointed at an unreachable host so anonymous requests return
    // null / error envelopes — the smoke target.
    const clerkPk = `pk_test_${Buffer.from(
        'test.clerk.smoke.invalid$'
    ).toString('base64')}`;

    server = spawn('node', [outputEntry], {
        env: {
            ...process.env,
            PORT: String(PORT),
            NITRO_PORT: String(PORT),
            HOST: '127.0.0.1',
            NITRO_HOST: '127.0.0.1',
            // Internal `/api/fetch-document` calls go through the
            // browser-style api-client, which builds absolute URLs
            // using `runtimeConfig.public.API_BASE_URL`. Nuxt picks
            // that up from `NUXT_PUBLIC_API_BASE_URL` at runtime.
            // Point it back at the smoke server itself so internal
            // round-trips work; downstream broker calls will fail
            // with a network error and fall through to null, which
            // is exactly the path we're stress-testing.
            NUXT_PUBLIC_API_BASE_URL: BASE,
            // Nuxt reads `runtimeConfig.public.CLERK_PUBLISHABLE_KEY`
            // and `runtimeConfig.CLERK_*` at runtime; the override
            // env vars must use the matching `NUXT_PUBLIC_` /
            // `NUXT_` prefix or they're ignored.
            NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY: clerkPk,
            NUXT_CLERK_SECRET_KEY: 'sk_test_smoke',
            NUXT_CLERK_JWT_KEY: 'smoke',
            // Belt-and-suspenders: keep the un-prefixed forms too
            // since some Clerk SDK paths read them directly.
            CLERK_PUBLISHABLE_KEY: clerkPk,
            CLERK_SECRET_KEY: 'sk_test_smoke',
            CLERK_JWT_KEY: 'smoke',
            NODE_ENV: 'production',
            // Short-circuit `/api/fetch-document` to return null for
            // every broker query. Without this, SSR pages chain
            // through to the LEAP broker and the test takes minutes
            // to fail on connection timeouts. With it, broker calls
            // return null in microseconds and we test the page's
            // "data is null" rendering paths — exactly the bugs that
            // hit production when an anonymous user (or a refresh
            // before client hydration) renders an SSR page.
            LEAP_BROKER_DISABLED: '1',
            // Clerk's SDK rejects the stub publishable key on real
            // invocation (i.e. on any API endpoint, plus on the
            // og-image module's internal page fetch). The OG-render
            // smoke check in `assertRenders` won't work without
            // bypass. `server/middleware/clerk.ts` reads this and
            // installs an anonymous no-op auth context. Production
            // never sets it.
            LEAP_DISABLE_CLERK: '1',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
    });

    server.stdout?.on('data', (d) => stdoutBuf.push(String(d)));
    server.stderr?.on('data', (d) => stderrBuf.push(String(d)));

    await waitForReady();
}, 120_000);

afterAll(() => {
    if (server) {
        server.kill('SIGTERM');
        server = null;
    }
});

describe('SSR smoke — anonymous renders should not 500', () => {
    for (const { label, url } of SMOKE_URLS) {
        it(
            `renders ${label} (${url})`,
            async () => {
                await assertRenders(BASE, url, stderrBuf);
            },
            30_000
        );
    }
});

// Touch the build entry once to fail fast if vitest is pointed at a
// stale `.output/` (instead of producing 7 indistinguishable timeouts).
describe('build sanity', () => {
    it('the production server bundle exists and references Nitro', () => {
        const entry = resolve(__dirname, '../.output/server/index.mjs');
        expect(existsSync(entry)).toBe(true);
        const head = readFileSync(entry, 'utf-8').slice(0, 500);
        expect(head).toMatch(/nitro|listhen|h3/i);
    });
});
