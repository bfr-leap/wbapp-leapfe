#!/usr/bin/env node
/**
 * Visual audit capture.
 *
 * Boots the production Nuxt server with `LEAP_BROKER_FIXTURES` pointed
 * at `tests/fixtures/broker/` so every page renders from canned data
 * (no real broker, no Clerk login). Then drives Playwright Chromium
 * through every (route × viewport) pair declared in `routes.mjs` and
 * `viewports.mjs`, writes one full-page PNG per pair, and additionally
 * fetches the Satori-rendered OG card for each route. Output is a
 * single timestamped directory under `audit/output/` containing:
 *
 *   <slug>__<viewport>.png    full-page screenshot at that viewport
 *   <slug>__og.png            OG card (1200x630, png)
 *   manifest.json             everything captured + env summary
 *
 * Intended consumer is an AI agent doing visual / UX review — having
 * a stable, fixture-backed set of PNGs across viewport sizes makes
 * "look at the app" tractable for an agent that can't run a browser
 * itself.
 *
 * Usage:
 *   npm run audit                          # build + capture everything
 *   node audit/capture.mjs                 # capture using existing build
 *   node audit/capture.mjs --routes=home,results
 *   node audit/capture.mjs --viewports=iphone-portrait,mbp-full
 *   node audit/capture.mjs --skip-og
 *   node audit/capture.mjs --out=/tmp/leap-audit
 *
 * Requires `nuxt build` to have produced `.output/server/index.mjs`.
 */

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
    existsSync,
    mkdirSync,
    readdirSync,
    statSync,
    writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

import { ROUTES } from './routes.mjs';
import { VIEWPORTS } from './viewports.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const OUTPUT_ENTRY = resolve(REPO_ROOT, '.output/server/index.mjs');
const FIXTURE_DIR = resolve(REPO_ROOT, 'tests/fixtures/broker');
const PORT = 4569;
const BASE = `http://127.0.0.1:${PORT}`;

// -----------------------------------------------------------------------------
// CLI parsing
// -----------------------------------------------------------------------------

function parseArgs(argv) {
    const opts = {
        routes: null, // null = all
        viewports: null, // null = all
        skipOg: false,
        outDir: null, // null = audit/output/<timestamp>
    };
    for (const arg of argv.slice(2)) {
        if (arg === '--skip-og') opts.skipOg = true;
        else if (arg.startsWith('--routes=')) {
            opts.routes = arg
                .slice('--routes='.length)
                .split(',')
                .filter(Boolean);
        } else if (arg.startsWith('--viewports=')) {
            opts.viewports = arg
                .slice('--viewports='.length)
                .split(',')
                .filter(Boolean);
        } else if (arg.startsWith('--out=')) {
            opts.outDir = arg.slice('--out='.length);
        } else if (arg === '--help' || arg === '-h') {
            console.log(
                'Usage: node audit/capture.mjs [--routes=a,b] ' +
                    '[--viewports=a,b] [--skip-og] [--out=dir]'
            );
            process.exit(0);
        } else {
            console.error(`Unknown argument: ${arg}`);
            process.exit(2);
        }
    }
    return opts;
}

// -----------------------------------------------------------------------------
// Fixture gap reporting
// -----------------------------------------------------------------------------

/**
 * Stable filename for a (namespace, type, query) tuple — mirrors the
 * scheme in `server/api/fetch-document.ts` exactly. Used here to label
 * the fixtures the audit run discovered are missing, so a follow-up
 * step can populate them without guessing the filename.
 */
function fixtureKey(namespace, type, query) {
    const filtered = {};
    for (const [k, v] of Object.entries(query)) {
        if (k === 'userID' || k === '_authHeader' || k === 'namespace')
            continue;
        if (v == null || v === '') continue;
        filtered[k] = String(v);
    }
    const keys = Object.keys(filtered).sort();
    const canon = keys.map((k) => `${k}=${filtered[k]}`).join('&');
    const hash = createHash('sha1').update(canon).digest('hex').slice(0, 10);
    return `${namespace}__${type}__${hash}`.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Walk the server's combined stdout+stderr looking for the two
 * complementary lines `LEAP_BROKER_FIXTURES` mode emits when a page
 * asks for a tuple that wasn't recorded:
 *
 *   1. The throw inside `fetch-document.ts` itself:
 *      `[broker-fixture] missing fixture for <ns>/<type> (key=<key>).`
 *   2. The caller's "fetch failed" line, which is richer because it
 *      contains the full query string:
 *      `Failed to fetch http://.../api/fetch-document?namespace=...&type=...&league=...`
 *
 * (2) is what we actually want — it lets us reconstruct the exact
 * query that needs a fixture, not just the namespace/type. The (1)
 * lines are still parsed as a safety net in case the caller line
 * doesn't make it to the log (e.g. an SSR path that swallows the
 * error before logging the URL).
 *
 * Returns a deduplicated list keyed on fixture filename. Each entry
 * has enough info for a follow-up step (either an agent or the
 * `/capture-broker` workflow) to populate the missing fixture without
 * re-running the audit just to find the filename.
 */
function parseMissingFixtures(text) {
    const byFilename = new Map();

    // Pass 1: URL-level errors. These give us the full query, so we
    // can compute the filename locally and emit the params verbatim.
    const urlRe =
        /Failed to fetch (https?:\/\/[^\s]+\/api\/fetch-document\?[^\s:]+)/g;
    let m;
    while ((m = urlRe.exec(text))) {
        try {
            const u = new URL(m[1]);
            const query = {};
            for (const [k, v] of u.searchParams.entries()) query[k] = v;
            const namespace = query.namespace || '';
            const type = query.type || '';
            if (!namespace || !type) continue;
            const filename = `${fixtureKey(namespace, type, query)}.json`;
            if (!byFilename.has(filename)) {
                byFilename.set(filename, {
                    filename,
                    namespace,
                    type,
                    query,
                });
            }
        } catch {
            // ignore malformed URLs
        }
    }

    // Pass 2: bare missing-fixture lines, in case the URL line didn't
    // also make it through. We can only report namespace+type+key,
    // not the query params.
    const bareRe =
        /missing fixture for ([^\s/]+)\/(\S+?) \(key=([A-Za-z0-9._-]+)\)/g;
    while ((m = bareRe.exec(text))) {
        const [, namespace, type, key] = m;
        const filename = `${key}.json`;
        if (!byFilename.has(filename)) {
            byFilename.set(filename, {
                filename,
                namespace,
                type,
                query: null,
            });
        }
    }

    return [...byFilename.values()].sort((a, b) =>
        a.filename.localeCompare(b.filename)
    );
}

// -----------------------------------------------------------------------------
// Chromium binary discovery
// -----------------------------------------------------------------------------

/**
 * Locate a working Chromium binary. `playwright-core.chromium.executablePath()`
 * returns the version the installed playwright-core wants (e.g. build
 * 1217), but the runtime environment may only have a nearby version
 * pre-staged under `$PLAYWRIGHT_BROWSERS_PATH` (e.g. build 1194). For
 * headless screenshot capture any recent Chromium works, so prefer the
 * advertised path, then fall back to scanning the browsers dir for any
 * `chromium-N/chrome-linux/chrome` binary. Returns `undefined` to let
 * Playwright use its default if nothing is found locally — `launch`
 * will then emit its usual "run npx playwright install" message.
 */
function findChromiumBinary() {
    try {
        const advertised = chromium.executablePath();
        if (advertised && existsSync(advertised)) return advertised;
    } catch {
        // chromium.executablePath() can throw if no install record
    }
    const browsersPath =
        process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
    if (!existsSync(browsersPath)) return undefined;
    let best = null;
    let bestBuild = -1;
    for (const entry of readdirSync(browsersPath)) {
        const m = entry.match(/^chromium-(\d+)$/);
        if (!m) continue;
        const build = Number(m[1]);
        // Two layouts depending on Playwright version — try both.
        const candidates = [
            resolve(browsersPath, entry, 'chrome-linux/chrome'),
            resolve(browsersPath, entry, 'chrome-linux64/chrome'),
        ];
        for (const c of candidates) {
            try {
                if (statSync(c).isFile() && build > bestBuild) {
                    best = c;
                    bestBuild = build;
                }
            } catch {
                // not present
            }
        }
    }
    return best || undefined;
}

// -----------------------------------------------------------------------------
// Server boot — mirrors tests/_smoke-helpers.ts but standalone so this
// script doesn't depend on TypeScript or vitest.
// -----------------------------------------------------------------------------

async function bootServer() {
    if (!existsSync(OUTPUT_ENTRY)) {
        throw new Error(
            `Missing ${OUTPUT_ENTRY}. Run \`npm run build\` first ` +
                `(or use \`npm run audit\`, which builds for you).`
        );
    }
    if (!existsSync(FIXTURE_DIR) || readdirSync(FIXTURE_DIR).length === 0) {
        throw new Error(
            `No fixtures found in ${FIXTURE_DIR}. The audit replays ` +
                `recorded broker responses — capture some first via ` +
                `the /capture-broker page and ` +
                `scripts/import-broker-fixtures.mjs.`
        );
    }

    // Throwaway Clerk publishable key whose base64 inner decodes to a
    // parseable hostname; without this vue-clerk throws at boot.
    const clerkPk = `pk_test_${Buffer.from(
        'test.clerk.audit.invalid$'
    ).toString('base64')}`;

    const stdoutBuf = [];
    const stderrBuf = [];

    const child = spawn('node', [OUTPUT_ENTRY], {
        env: {
            ...process.env,
            PORT: String(PORT),
            NITRO_PORT: String(PORT),
            HOST: '127.0.0.1',
            NITRO_HOST: '127.0.0.1',
            NUXT_PUBLIC_API_BASE_URL: BASE,
            NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY: clerkPk,
            NUXT_CLERK_SECRET_KEY: 'sk_test_audit',
            NUXT_CLERK_JWT_KEY: 'audit',
            CLERK_PUBLISHABLE_KEY: clerkPk,
            CLERK_SECRET_KEY: 'sk_test_audit',
            CLERK_JWT_KEY: 'audit',
            NODE_ENV: 'production',
            LEAP_DISABLE_CLERK: '1',
            LEAP_BROKER_FIXTURES: FIXTURE_DIR,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout?.on('data', (d) => stdoutBuf.push(String(d)));
    child.stderr?.on('data', (d) => stderrBuf.push(String(d)));

    await waitForReady(stdoutBuf, stderrBuf);

    return {
        kill: () => child.kill('SIGTERM'),
        stdoutBuf,
        stderrBuf,
    };
}

async function waitForReady(stdoutBuf, stderrBuf, timeoutMs = 60_000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            const res = await fetch(`${BASE}/api/og-payload?m=__audit_probe`, {
                signal: AbortSignal.timeout(3_000),
            });
            if (res.status > 0) return;
        } catch {
            // not ready yet
        }
        await new Promise((r) => setTimeout(r, 250));
    }
    throw new Error(
        `Server didn't come up within ${timeoutMs}ms\n` +
            `stdout:\n${stdoutBuf.join('').slice(-2000)}\n` +
            `stderr:\n${stderrBuf.join('').slice(-2000)}`
    );
}

// -----------------------------------------------------------------------------
// Capture helpers
// -----------------------------------------------------------------------------

async function settlePage(page, route) {
    // Give web fonts a chance to load — first-paint screenshots before
    // fonts swap in produce wildly different visuals at the same
    // viewport across runs.
    try {
        await page.evaluate(() => document.fonts && document.fonts.ready);
    } catch {
        // older runtimes / non-html docs
    }
    if (route.waitFor) {
        await page.waitForSelector(route.waitFor, { timeout: 10_000 });
    }
    // Short settle for any post-mount D3 / chart renders.
    await page.waitForTimeout(400);
}

async function capturePage(browser, route, viewportName, viewport, outDir) {
    const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: viewport.deviceScaleFactor,
        isMobile: viewport.isMobile,
        // Phones report touch in Chromium when isMobile=true; harmless
        // for desktop too.
        hasTouch: viewport.isMobile,
        reducedMotion: 'reduce',
        colorScheme: 'dark',
    });
    const page = await context.newPage();

    const file = `${route.slug}__${viewportName}.png`;
    const filePath = resolve(outDir, file);
    let error = null;
    let bytes = 0;
    let httpStatus = null;
    try {
        const response = await page.goto(`${BASE}${route.url}`, {
            waitUntil: 'load',
            timeout: 30_000,
        });
        httpStatus = response?.status() ?? null;
        await settlePage(page, route);
        const buf = await page.screenshot({ path: filePath, fullPage: true });
        bytes = buf.length;
        // A 500 SSR error still paints a screenshot (Nuxt's error page),
        // but visually it's just "500 Cannot read properties of undefined".
        // Flag it as an error so it stands out in the run summary — the
        // PNG is left in place for diagnostic inspection.
        if (httpStatus !== null && httpStatus >= 500) {
            error = `HTTP ${httpStatus} (page rendered Nuxt error template)`;
        }
    } catch (e) {
        error = e instanceof Error ? e.message : String(e);
    } finally {
        await context.close();
    }

    return {
        kind: 'page',
        slug: route.slug,
        viewport: viewportName,
        url: route.url,
        file,
        bytes,
        httpStatus,
        error,
    };
}

async function captureOg(route, outDir) {
    const file = `${route.slug}__og.png`;
    const filePath = resolve(outDir, file);
    try {
        // Fetch the page HTML and pull the og:image URL out of the
        // meta tag — same approach the smoke test uses. Going through
        // the meta tag (rather than guessing the og module's URL
        // shape) means we follow whatever the page actually advertises
        // to unfurlers.
        const pageRes = await fetch(`${BASE}${route.url}`, {
            signal: AbortSignal.timeout(20_000),
        });
        const html = await pageRes.text();
        const match = html.match(
            /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/
        );
        if (!match) {
            return {
                kind: 'og',
                slug: route.slug,
                file,
                bytes: 0,
                error: 'no og:image meta tag on rendered page',
            };
        }
        const ogUrl = match[1];
        const ogRes = await fetch(ogUrl, {
            signal: AbortSignal.timeout(30_000),
        });
        if (ogRes.status >= 400) {
            return {
                kind: 'og',
                slug: route.slug,
                file,
                bytes: 0,
                error: `og fetch HTTP ${ogRes.status}`,
            };
        }
        const buf = Buffer.from(await ogRes.arrayBuffer());
        writeFileSync(filePath, buf);
        return {
            kind: 'og',
            slug: route.slug,
            file,
            bytes: buf.length,
            ogUrl,
            error: null,
        };
    } catch (e) {
        return {
            kind: 'og',
            slug: route.slug,
            file,
            bytes: 0,
            error: e instanceof Error ? e.message : String(e),
        };
    }
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

function timestamp() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return (
        `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(
            d.getUTCDate()
        )}` +
        `-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(
            d.getUTCSeconds()
        )}`
    );
}

async function main() {
    const opts = parseArgs(process.argv);

    const routes = opts.routes
        ? ROUTES.filter((r) => opts.routes.includes(r.slug))
        : ROUTES;
    if (opts.routes && routes.length !== opts.routes.length) {
        const have = new Set(routes.map((r) => r.slug));
        const missing = opts.routes.filter((s) => !have.has(s));
        throw new Error(
            `Unknown route slug(s): ${missing.join(', ')}. ` +
                `Available: ${ROUTES.map((r) => r.slug).join(', ')}`
        );
    }

    const viewportEntries = opts.viewports
        ? Object.entries(VIEWPORTS).filter(([k]) => opts.viewports.includes(k))
        : Object.entries(VIEWPORTS);
    if (opts.viewports && viewportEntries.length !== opts.viewports.length) {
        const have = new Set(viewportEntries.map(([k]) => k));
        const missing = opts.viewports.filter((v) => !have.has(v));
        throw new Error(
            `Unknown viewport name(s): ${missing.join(', ')}. ` +
                `Available: ${Object.keys(VIEWPORTS).join(', ')}`
        );
    }

    const outDir = opts.outDir
        ? resolve(opts.outDir)
        : resolve(REPO_ROOT, `audit/output/${timestamp()}`);
    mkdirSync(outDir, { recursive: true });

    console.log(`[audit] output → ${outDir}`);
    console.log(
        `[audit] ${routes.length} route(s) × ${viewportEntries.length} ` +
            `viewport(s) = ${routes.length * viewportEntries.length} page ` +
            `screenshot(s)${
                opts.skipOg ? '' : ` + up to ${routes.length} OG card(s)`
            }`
    );

    const server = await bootServer();
    console.log(`[audit] server ready on ${BASE}`);

    let browser = null;
    const captures = [];
    let pagesDone = 0;
    let pagesFailed = 0;
    try {
        browser = await chromium.launch({
            headless: true,
            executablePath: findChromiumBinary(),
        });

        for (const route of routes) {
            const allowed = route.viewports
                ? viewportEntries.filter(([k]) => route.viewports.includes(k))
                : viewportEntries;
            for (const [vpName, vp] of allowed) {
                process.stdout.write(`[audit] ${route.slug} @ ${vpName} … `);
                const result = await capturePage(
                    browser,
                    route,
                    vpName,
                    vp,
                    outDir
                );
                captures.push(result);
                if (result.error) {
                    pagesFailed++;
                    process.stdout.write(`FAIL (${result.error})\n`);
                } else {
                    pagesDone++;
                    process.stdout.write(
                        `${(result.bytes / 1024).toFixed(0)} KB\n`
                    );
                }
            }
            if (!opts.skipOg && route.captureOg !== false) {
                process.stdout.write(`[audit] ${route.slug} @ og … `);
                const result = await captureOg(route, outDir);
                captures.push(result);
                if (result.error) {
                    process.stdout.write(`FAIL (${result.error})\n`);
                } else {
                    process.stdout.write(
                        `${(result.bytes / 1024).toFixed(0)} KB\n`
                    );
                }
            }
        }
    } finally {
        if (browser) await browser.close();
        server.kill();
    }

    // Parse the server's log for missing-fixture errors. A successful
    // screenshot run can still mean every page rendered an empty-state
    // because broker fetches 500'd and the model layer caught the
    // error and returned defaults. Surfacing the gaps here makes that
    // failure mode loud instead of silent.
    const serverLog =
        server.stdoutBuf.join('') + '\n' + server.stderrBuf.join('');
    const missingFixtures = parseMissingFixtures(serverLog);

    const manifest = {
        capturedAt: new Date().toISOString(),
        base: BASE,
        fixtureDir: FIXTURE_DIR,
        viewports: Object.fromEntries(viewportEntries),
        routes: routes.map((r) => ({
            slug: r.slug,
            label: r.label,
            url: r.url,
            section: r.section,
            notes: r.notes,
        })),
        captures,
        missingFixtures,
        summary: {
            pages: pagesDone,
            pagesFailed,
            og: captures.filter((c) => c.kind === 'og' && !c.error).length,
            ogFailed: captures.filter((c) => c.kind === 'og' && c.error).length,
            missingFixtures: missingFixtures.length,
        },
    };
    writeFileSync(
        resolve(outDir, 'manifest.json'),
        JSON.stringify(manifest, null, 2) + '\n'
    );
    if (missingFixtures.length > 0) {
        writeFileSync(
            resolve(outDir, 'missing-fixtures.json'),
            JSON.stringify(missingFixtures, null, 2) + '\n'
        );
    }

    console.log(
        `[audit] done. pages: ${pagesDone} ok, ${pagesFailed} failed. ` +
            `og: ${manifest.summary.og} ok, ${manifest.summary.ogFailed} failed.`
    );
    if (missingFixtures.length > 0) {
        console.log(
            `[audit] WARNING: ${missingFixtures.length} broker tuple(s) had ` +
                `no fixture — pages probably rendered empty states. See ` +
                `${resolve(outDir, 'missing-fixtures.json')}:`
        );
        for (const m of missingFixtures.slice(0, 20)) {
            console.log(`         ${m.filename}`);
        }
        if (missingFixtures.length > 20) {
            console.log(`         … and ${missingFixtures.length - 20} more`);
        }
    }
    if (
        pagesFailed > 0 ||
        manifest.summary.ogFailed > 0 ||
        missingFixtures.length > 0
    ) {
        process.exitCode = 1;
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
