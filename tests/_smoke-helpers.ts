/**
 * Shared helpers for the SSR smoke tests.
 *
 * Each smoke test file (`ssr-smoke.test.ts`,
 * `ssr-smoke-fixtures.test.ts`) boots its own Nitro server with a
 * different broker config, but the boot scaffolding — clerk-key
 * generation, env propagation, ready-probe, log capture, shutdown —
 * is identical. Extract here so the per-file tests are easy to read.
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export interface SmokeServerHandle {
    base: string;
    stdoutBuf: string[];
    stderrBuf: string[];
    kill: () => void;
}

interface BootOptions {
    /** TCP port to bind the smoke server to. */
    port: number;
    /** Extra environment variables to set on the spawned server. */
    env: Record<string, string>;
}

/**
 * Boots `.output/server/index.mjs` with the given env additions on
 * top of a baseline that makes the server reachable without a real
 * Clerk app or LEAP broker. Returns once `/api/og-payload?...`
 * answers — the cheap "is the server up?" probe.
 */
export async function bootSmokeServer(
    opts: BootOptions
): Promise<SmokeServerHandle> {
    const outputEntry = resolve(__dirname, '../.output/server/index.mjs');
    if (!existsSync(outputEntry)) {
        throw new Error(
            `Missing .output/server/index.mjs — run \`npm run build\` ` +
                `first (or use \`npm run test:smoke\`, which builds for you).`
        );
    }

    const base = `http://127.0.0.1:${opts.port}`;

    // A throwaway Clerk publishable key whose base64 inner decodes to
    // a parseable hostname; without that, vue-clerk throws at boot.
    const clerkPk = `pk_test_${Buffer.from(
        'test.clerk.smoke.invalid$'
    ).toString('base64')}`;

    const stdoutBuf: string[] = [];
    const stderrBuf: string[] = [];

    const child = spawn('node', [outputEntry], {
        env: {
            ...process.env,
            PORT: String(opts.port),
            NITRO_PORT: String(opts.port),
            HOST: '127.0.0.1',
            NITRO_HOST: '127.0.0.1',
            // Internal `/api/fetch-document` calls go through the
            // browser-style api-client which builds absolute URLs
            // from `runtimeConfig.public.API_BASE_URL`. Point that
            // back at this same server so internal round-trips
            // resolve correctly.
            NUXT_PUBLIC_API_BASE_URL: base,
            NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY: clerkPk,
            NUXT_CLERK_SECRET_KEY: 'sk_test_smoke',
            NUXT_CLERK_JWT_KEY: 'smoke',
            CLERK_PUBLISHABLE_KEY: clerkPk,
            CLERK_SECRET_KEY: 'sk_test_smoke',
            CLERK_JWT_KEY: 'smoke',
            NODE_ENV: 'production',
            ...opts.env,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout?.on('data', (d) => stdoutBuf.push(String(d)));
    child.stderr?.on('data', (d) => stderrBuf.push(String(d)));

    await waitForReady(base, stdoutBuf, stderrBuf);

    return {
        base,
        stdoutBuf,
        stderrBuf,
        kill: () => child.kill('SIGTERM'),
    };
}

async function waitForReady(
    base: string,
    stdoutBuf: string[],
    stderrBuf: string[],
    timeoutMs = 60_000
): Promise<void> {
    // Probe `/api/og-payload` rather than `/`: page renders touch
    // a long broker chain that can hang for 20+ seconds even when
    // the server is listening. The og-payload endpoint also touches
    // the broker but with bounded internal latency, AND any HTTP
    // status proves the listener is up.
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            const res = await fetch(`${base}/api/og-payload?m=__smoke_probe`, {
                signal: AbortSignal.timeout(3_000),
            });
            if (res.status > 0) return;
        } catch {
            // not ready yet
        }
        await new Promise((r) => setTimeout(r, 250));
    }
    throw new Error(
        `Smoke server didn't come up within ${timeoutMs}ms\n` +
            `stdout:\n${stdoutBuf.join('').slice(-2000)}\n` +
            `stderr:\n${stderrBuf.join('').slice(-2000)}`
    );
}

export interface SmokeUrl {
    label: string;
    url: string;
}

/**
 * The shareable-URL shapes we know exist in the wild. Used by both
 * smoke modes so each one covers the same surface. New URL shapes
 * to test go here.
 */
export const SMOKE_URLS: SmokeUrl[] = [
    { label: 'home (bare)', url: '/' },
    {
        label: 'home (league + season hints)',
        url: '/?league=4534&season=131502',
    },
    {
        label: 'results',
        url: '/?m=results&league=4534&season=131502&subsession=84522154&simsession=0',
    },
    { label: 'standings', url: '/?m=standings&league=4534&season=131502' },
    { label: 'season', url: '/?m=season&league=4534&season=131502' },
    { label: 'rulings', url: '/?m=rulings&league=4534&season=131502' },
    { label: 'driver', url: '/?m=driver&league=4534&driver=174470' },
];

/**
 * Standard assertions every smoke URL must satisfy regardless of
 * which broker mode is active.
 */
export async function assertRenders(
    base: string,
    url: string,
    stderrBuf: string[]
): Promise<void> {
    const res = await fetch(`${base}${url}`, {
        signal: AbortSignal.timeout(20_000),
    });
    const html = await res.text();
    if (res.status >= 500) {
        console.error(
            `--- smoke server stderr (last 4KB) for ${url} ---\n${stderrBuf
                .join('')
                .slice(-4096)}\n--- end ---`
        );
    }
    if (res.status >= 500) {
        throw new Error(`HTTP ${res.status} for ${url}: ${html.slice(0, 400)}`);
    }
    if (!/property=["']og:image["']/.test(html)) {
        throw new Error(`og:image meta missing on ${url}`);
    }
}
