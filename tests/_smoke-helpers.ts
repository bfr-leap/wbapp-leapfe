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
            // The stub Clerk key passes format checks but Clerk's SDK
            // rejects it on real use, which breaks every API endpoint
            // — and (critically) the og-image module's internal page
            // fetch when rendering `/__og-image__/image/og.png`.
            // Disable the middleware entirely under smoke so the full
            // Discord-unfurl path can run end-to-end. Production never
            // sets this flag.
            LEAP_DISABLE_CLERK: '1',
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
    // A season the simracerhub dataset covers — exercises the srhweb path
    // and its extra surfaces. The line above stays as the fallback case.
    {
        label: 'standings (srhweb season)',
        url: '/?m=standings&league=4534&season=134456',
    },
    { label: 'season', url: '/?m=season&league=4534&season=131502' },
    { label: 'rulings', url: '/?m=rulings&league=4534&season=131502' },
    { label: 'driver', url: '/?m=driver&league=4534&driver=174470' },
];

/**
 * Standard assertions every smoke URL must satisfy regardless of
 * which broker mode is active.
 *
 * Three checks on each rendered page:
 *  - Status < 500 (page didn't blow up SSR-side).
 *  - `og:image` meta tag present (crawlers have a URL to fetch).
 *  - `#nuxt-og-image-options` script tag present (the marker the
 *    og-image module reads to recover the `defineOgImage` payload).
 *    Without it, the module crashes with "Failed to read the path …"
 *    on every Discord/Twitter unfurl. The marker is what we caught
 *    going missing the first time around, when the `defineOgImage`
 *    call was guarded behind `if (ogPayload.value)` and a transient
 *    payload failure removed the entire OG card from the page.
 *
 * The full end-to-end "did the Card template actually render" check
 * would hit `/__og-image__/image/og.html?…`, but that endpoint makes
 * an internal Nitro fetch that hits the Clerk middleware in a way
 * that fails with the stub publishable key the smoke harness uses.
 * Rather than wire up a real Clerk dev key for tests, the file-
 * existence check in `ssr-smoke-static.test.ts` covers the
 * "Card template moved" regression class statically.
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
        throw new Error(`HTTP ${res.status} for ${url}: ${html.slice(0, 400)}`);
    }
    if (!/property=["']og:image["']/.test(html)) {
        throw new Error(`og:image meta missing on ${url}`);
    }
    if (!html.includes('nuxt-og-image-options')) {
        throw new Error(
            `OG image payload marker missing on ${url}. The page ` +
                `should always call \`defineOgImageComponent('Card', …)\` ` +
                `so the module has something to render — check the call ` +
                `isn't behind an \`if (ogPayload.value)\` guard or ` +
                `otherwise gated on a request that can fail.`
        );
    }
    // Pull the marker contents and confirm the resolved component
    // is OUR Card, not the module's default fallback. The script tag
    // body is devalue-encoded, but the resolved pascalName appears as
    // a quoted string regardless. Two assertions:
    //   - `LeapOgCard` is present  → our template was matched
    //   - `NuxtSeo`   is absent    → the fallback wasn't chosen
    // (NuxtSeo is the community-default template the module reaches
    // for when the call site passes a bad component name, e.g. by
    // using `defineOgImage('Card', …)` instead of
    // `defineOgImageComponent('Card', …)`. The string-as-options
    // mistake spreads 'Card' into `props` as `{0:'C',1:'a',...}` and
    // leaves `component` unset.)
    const markerMatch = html.match(
        /<script[^>]*id="nuxt-og-image-options"[^>]*>([^<]+)<\/script>/
    );
    if (!markerMatch) {
        throw new Error(
            `Couldn't extract the og-image-options script body on ${url}`
        );
    }
    const markerBody = markerMatch[1];
    if (!markerBody.includes('"LeapOgCard"')) {
        throw new Error(
            `OG image marker on ${url} doesn't resolve to LeapOgCard — ` +
                `got body: ${markerBody.slice(0, 300)}…\n` +
                `Likely cause: \`pages/index.vue\` calls ` +
                `\`defineOgImage('Card', …)\` (string positional) instead ` +
                `of \`defineOgImageComponent('Card', …)\`.`
        );
    }
    if (markerBody.includes('"NuxtSeo"')) {
        throw new Error(
            `OG image marker on ${url} contains "NuxtSeo" — the module ` +
                `fallback template was selected instead of our Card. ` +
                `Check the call to \`defineOgImageComponent('Card', …)\` ` +
                `in pages/index.vue.`
        );
    }

    // End-to-end OG render: follow the exact URL the page emits in
    // its `og:image` meta tag — that's what Discord, Twitter, and
    // every other unfurler fetch. The og-image module encodes the
    // page's route query as a single `_query={…JSON…}` param;
    // hitting `og.png?m=…&league=…` directly takes a different code
    // path that doesn't reconstruct the basePath. Possible to render
    // locally only because the smoke harness sets `LEAP_DISABLE_CLERK=1` —
    // the og module's internal page fetch goes through every server
    // middleware including Clerk, and the stub publishable key the
    // harness uses gets rejected on real invocation.
    const metaMatch = html.match(
        /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/
    );
    if (!metaMatch) {
        throw new Error(`Couldn't extract og:image meta URL from ${url}`);
    }
    const ogPngUrl = metaMatch[1];
    // Use the .html variant for the body fingerprint check (faster
    // and easier to grep than satori-rendered PNG bytes), but keep
    // the same query string the page emitted.
    const ogHtmlUrl = ogPngUrl.replace(/\/og\.png(\?|$)/, '/og.html$1');
    const ogHtmlRes = await fetch(ogHtmlUrl, {
        signal: AbortSignal.timeout(30_000),
    });
    const ogHtml = await ogHtmlRes.text();
    if (ogHtmlRes.status >= 500) {
        console.error(
            `--- smoke server stderr (last 4KB) for og.html ${url} ---\n${stderrBuf
                .join('')
                .slice(-4096)}\n--- end ---`
        );
        throw new Error(
            `og.html HTTP ${ogHtmlRes.status} for ${url}: ` +
                `${ogHtml.slice(0, 400)}`
        );
    }
    if (!ogHtml.includes('bluefrogracing.com')) {
        throw new Error(
            `og.html for ${url} doesn't render the LEAP Card template ` +
                `(no "bluefrogracing.com" footer — that's the unique ` +
                `fingerprint of components/LeapOg/Card.vue). The module ` +
                `probably resolved to a different template. Inspect ` +
                `the marker on the page response and check ` +
                `\`pages/index.vue\` / \`nuxt.config.ts\`.`
        );
    }

    const ogPngRes = await fetch(ogPngUrl, {
        signal: AbortSignal.timeout(30_000),
    });
    if (ogPngRes.status >= 500) {
        const body = await ogPngRes.text();
        console.error(
            `--- smoke server stderr (last 4KB) for og.png ${url} ---\n${stderrBuf
                .join('')
                .slice(-4096)}\n--- end ---`
        );
        throw new Error(
            `og.png HTTP ${ogPngRes.status} for ${url}: ${body.slice(0, 400)}`
        );
    }
    const ogPngBuf = Buffer.from(await ogPngRes.arrayBuffer());
    if (ogPngBuf.length < 1000) {
        throw new Error(
            `og.png for ${url} is suspiciously small (${ogPngBuf.length} ` +
                `bytes). A real Satori render is tens of KB; this is ` +
                `probably an error JSON body.`
        );
    }
    // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
    const isPng =
        ogPngBuf[0] === 0x89 &&
        ogPngBuf[1] === 0x50 &&
        ogPngBuf[2] === 0x4e &&
        ogPngBuf[3] === 0x47;
    if (!isPng) {
        throw new Error(
            `og.png for ${url} isn't a PNG — first bytes ` +
                `${ogPngBuf.slice(0, 8).toString('hex')}. ` +
                `Body: ${ogPngBuf.slice(0, 200).toString('utf-8')}`
        );
    }
}
