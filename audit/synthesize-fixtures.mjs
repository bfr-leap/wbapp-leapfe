#!/usr/bin/env node
/**
 * Fill the gaps in `tests/fixtures/broker/` so the visual audit
 * renders pages with realistic-looking content instead of empty
 * states.
 *
 * Two classes of fix:
 *
 *  1. **Stubs.** Tuples a page genuinely calls but for which an empty
 *     / null response is fine for visual review (chart endpoints,
 *     telemetry lists, config flags). Writing a minimal valid value
 *     under the right filename stops `LEAP_BROKER_FIXTURES` from
 *     throwing 500s and lets the surrounding page chrome render.
 *
 *  2. **Cross-fixture coherence.** The corpus was captured at
 *     different times by different operators, so e.g.
 *     `leagueDriverStats` covers a set of seasons that doesn't overlap
 *     with `leagueSimsessionIndex`, and `membersData.members[]` has
 *     cust_ids that don't appear in the stats. We patch that here by
 *     re-keying the stats so they DO cover season 131502 (the one the
 *     index has rich data for) using cust_ids that exist in
 *     `membersData`.
 *
 * The script is idempotent: it only writes a file if its content
 * would change. Running it twice is a no-op. Safe to re-run after
 * a fresh `/capture-broker` import — anything the live capture filled
 * in will simply skip the synthesis step.
 *
 * Usage:
 *   node audit/synthesize-fixtures.mjs
 *   node audit/synthesize-fixtures.mjs --dry-run
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = resolve(__dirname, '../tests/fixtures/broker');
const DRY_RUN = process.argv.includes('--dry-run');

// The "canonical" tuple every fixture is steered toward. Picked
// because `leagueSeasons`, `leagueSimsessionIndex`, and the existing
// `defLgSeasSubCtx` variants all already use it.
const LEAGUE_ID = 4534;
const SEASON_ID = 131502;
const SUBSESSION_ID = 84522154;
const SIM_SESSION = 0;
const DRIVER_CUST_ID = 174470;

let written = 0;
let skipped = 0;

function readJson(filename) {
    const path = resolve(FIXTURE_DIR, filename);
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, 'utf-8'));
}

function writeFixture(filename, value) {
    const path = resolve(FIXTURE_DIR, filename);
    const next = JSON.stringify(value, null, 2) + '\n';
    if (existsSync(path)) {
        const current = readFileSync(path, 'utf-8');
        if (current === next) {
            skipped++;
            return;
        }
    }
    if (DRY_RUN) {
        console.log(`[dry-run] would write ${filename}`);
    } else {
        writeFileSync(path, next);
        console.log(`[synth] wrote ${filename}`);
    }
    written++;
}

// -----------------------------------------------------------------------------
// Source fixtures we draw from
// -----------------------------------------------------------------------------

const members = readJson('ldata-irweb__membersData__95a253d21c.json');
const leagueDriverStats = readJson(
    'ldata-rsltsts__leagueDriverStats__ee4990d64b.json'
);
const simsessionIndex = readJson(
    'ldata-rsltsts__leagueSimsessionIndex__3a1d2dd3cf.json'
);
const trackInfoDirectory = readJson(
    'ldata-rsltsts__trackInfoDirectory__1ce8c04fa5.json'
);

if (!members || !leagueDriverStats || !simsessionIndex || !trackInfoDirectory) {
    console.error(
        'One or more source fixtures are missing — cannot synthesize. ' +
            'Make sure these exist:\n' +
            '  ldata-irweb__membersData__95a253d21c.json\n' +
            '  ldata-rsltsts__leagueDriverStats__ee4990d64b.json\n' +
            '  ldata-rsltsts__leagueSimsessionIndex__3a1d2dd3cf.json\n' +
            '  ldata-rsltsts__trackInfoDirectory__1ce8c04fa5.json'
    );
    process.exit(1);
}

// -----------------------------------------------------------------------------
// 1. defLgSeasSubCtx — no-subsession variant
//
// The home page (and any link with just league+season) calls this
// without a subsession in the query string. Without a fixture the
// model layer falls back to `getDefaultModel()`, which picks a
// different season the rest of the corpus doesn't cover, and the
// cascade renders empty states everywhere downstream. Returning the
// canonical (league, season, subsession) tuple stops the fallback
// dead.
// -----------------------------------------------------------------------------

writeFixture('ldata-usrcfg__defLgSeasSubCtx__9769ed1076.json', {
    league_id: LEAGUE_ID,
    season_id: SEASON_ID,
    subsession_id: SUBSESSION_ID,
});

// -----------------------------------------------------------------------------
// 2. leagueDriverStats — re-keyed for season 131502
//
// The stats fixture as captured covers seasons 126152..992708 — none
// overlap with the simsessionIndex's 131502. The standings page does
// `stats[seasonId]` and renders "Standings not Available" when that
// lookup misses. We graft a season-131502 entry onto the stats by
// taking the densest existing season (largest driver count) and
// re-mapping its drivers onto cust_ids that EXIST in membersData —
// otherwise the standings would render rows with no driver names.
// -----------------------------------------------------------------------------

if (!leagueDriverStats[SEASON_ID]) {
    const memberIds = members.members.map((m) => m.cust_id);

    // Pick the season with the most drivers as the donor — gives the
    // standings table the longest, most representative roster.
    let donorSeason = null;
    let donorCount = -1;
    for (const [seasonKey, seasonStats] of Object.entries(leagueDriverStats)) {
        const n = Object.keys(seasonStats).length;
        if (n > donorCount) {
            donorCount = n;
            donorSeason = seasonKey;
        }
    }
    const donorEntries = Object.values(leagueDriverStats[donorSeason]);
    const limit = Math.min(donorEntries.length, memberIds.length);
    const remapped = {};
    for (let i = 0; i < limit; i++) {
        const newCustId = memberIds[i];
        const stat = { ...donorEntries[i], cust_id: newCustId };
        remapped[newCustId] = stat;
    }
    const augmented = { ...leagueDriverStats, [SEASON_ID]: remapped };
    writeFixture(
        'ldata-rsltsts__leagueDriverStats__ee4990d64b.json',
        augmented
    );
}

// -----------------------------------------------------------------------------
// 3. trackDisplayInfo — derive from trackInfoDirectory
//
// `CuratedTrackDisplayhInfo` is a flat map
//   `{ [trackId]: { short_display, display } }`
// whereas `trackInfoDirectory` has a simpler
//   `{ track_display: { [trackId]: "Name" } }`.
// We transform the simpler form into the curated shape so any
// component that looks up a track by id (track-banner, event card,
// race breadcrumb) finds the name it expects.
// -----------------------------------------------------------------------------

if (trackInfoDirectory.track_display) {
    const curated = {};
    for (const [trackId, name] of Object.entries(
        trackInfoDirectory.track_display
    )) {
        const display = typeof name === 'string' ? name : String(name);
        curated[trackId] = { display, short_display: display };
    }
    writeFixture('ldata-usrcfg__trackDisplayInfo__1ec16abbc2.json', curated);
}

// -----------------------------------------------------------------------------
// 4. leagueSeasonSessions — null
//
// The richer LSS_Session shape (track, launch_at, cars, weather, etc.)
// isn't recoverable from `simsessionIndex`, which only carries
// session_id / subsession_id / title / simsessions[]. Synthesizing
// the missing fields would mean fabricating per-race track ids and
// launch dates — that lands us in "made-up motorsport data" territory.
// Returning null is what the service returns when the broker has
// nothing, so the past-events list renders its empty state without
// crashing on `session.track.track_id`.
// -----------------------------------------------------------------------------

writeFixture('ldata-irweb__leagueSeasonSessions__695f72c3d8.json', null);

// -----------------------------------------------------------------------------
// 5. Empty/null stubs for endpoints whose absence breaks rendering
// but whose contents are not visually load-bearing (charts that read
// the broker, telemetry lists, config-shaped lookups). The shape has
// to match what each service's type contract says — a bare `null` is
// only OK where the service signature returns `T | null`.
// -----------------------------------------------------------------------------

/** @type {Array<[string, unknown]>} */
const stubs = [
    // BlockedSeasons = { [key: string]: boolean | number }; empty is fine.
    ['ldata-irweb__blockedSeasons__fa7f18c9ae.json', {}],
    ['ldata-irweb__lapChartData__d64f07e58b.json', null],
    ['ldata-charts__cumulativeDeltaChartData__4ad1e90699.json', null],
    ['ldata-charts__startFinishChartData__cb7f777297.json', null],
    ['ldata-gentxt__simsessionSummary__d530356d6b.json', null],
    ['ldata-irrpy__telemetrySubsessions__b8596b3f37.json', []],
];

for (const [filename, value] of stubs) {
    writeFixture(filename, value);
}

console.log(`[synth] done. ${written} file(s) written, ${skipped} unchanged.`);
