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

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Mirror of `fixtureKey()` in `server/api/fetch-document.ts` — given a
 * (namespace, type, query) tuple, compute the filename the broker
 * fixture-replay mode looks up. Used here so we can generate stubs
 * for parameterized callers (per-driver fetches, etc.) without
 * hand-computing each hash.
 */
function fixtureKey(namespace, type, query) {
    const filtered = {};
    for (const [k, v] of Object.entries({ namespace, type, ...query })) {
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

/**
 * Write a synthetic fixture only when one doesn't already exist on
 * disk. The script's job is to fill gaps so the audit renders
 * something coherent; any fixture captured live from the real broker
 * via `/capture-broker` should always win over a synthesized stub.
 * Re-running synth after an import is a no-op for anything captured.
 */
function writeFixture(filename, value) {
    const path = resolve(FIXTURE_DIR, filename);
    if (existsSync(path)) {
        skipped++;
        return;
    }
    const next = JSON.stringify(value, null, 2) + '\n';
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
// 2. (intentionally empty — `leagueDriverStats` is captured live now)
//
// An earlier version of this script grafted a fake season-131502
// entry onto the standings fixture by re-keying donor data onto
// membersData cust_ids. Removed once `/capture-broker` started
// pulling the real broker response, which carries the active season
// directly. If a future audit run reports `leagueDriverStats` missing,
// re-run `/capture-broker` on a deployed preview to refresh it.
// -----------------------------------------------------------------------------

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
    // DotdProfile is nullable in the service signature — null fine.
    ['ldata-gentxt__dotdProfile__12d2ce19a5.json', null],
];

// driverSessionResults stubs for EVERY cust_id the page might fetch.
// The driver profile model early-returns to a fully-defaulted view when
// ANY of race/sprint/quali is null, so all three must be present and
// non-null. The home page's DriverSpotlight component additionally
// resolves a "protagonist" from the league roster and fetches that
// driver's race results — which means the URL we hit (driver=174470)
// is not the only cust_id the page asks about; standings, season, and
// spotlight callers can ask for any cust_id in `members.cust_ids` or
// the rekeyed leagueDriverStats roster. Generating an empty stub for
// every (cust_id, sessionType) avoids whack-a-mole.
const candidateCustIds = new Set();
for (const cid of members.cust_ids || []) candidateCustIds.add(String(cid));
for (const m of members.members || []) candidateCustIds.add(String(m.cust_id));
// Whichever drivers ended up in the augmented standings — same set we
// re-keyed onto in step 2 above.
const augmentedSeason = readJson(
    'ldata-rsltsts__leagueDriverStats__ee4990d64b.json'
)?.[SEASON_ID];
for (const cid of Object.keys(augmentedSeason || {})) {
    candidateCustIds.add(String(cid));
}
candidateCustIds.add(String(DRIVER_CUST_ID));

for (const custId of candidateCustIds) {
    for (const sessionType of ['race', 'sprint', 'quali']) {
        const filename =
            fixtureKey('ldata-rsltsts', 'driverSessionResults', {
                type: 'driverSessionResults',
                league: String(LEAGUE_ID),
                custId,
                sessionType,
            }) + '.json';
        stubs.push([filename, {}]);
    }
}

// -----------------------------------------------------------------------------
// 6. leagueRoster — derive from membersData
//
// The roster page (and a few sidebar surfaces) pulls a flat list of
// drivers with car numbers via `getLeagueRoster`. Synthesizing it
// from `membersData.members[]` gives the roster real (anonymized)
// names; the car_number field defaults to position-in-list since the
// number isn't available in the donor data — it's just a label.
// -----------------------------------------------------------------------------

const rosterEntries = (members.members || []).map((m, i) => ({
    cust_id: m.cust_id,
    car_number: String((i + 1) * 7), // arbitrary but stable labels
    display_name: m.display_name,
}));
writeFixture('ldata-irweb__leagueRoster__f1b7ebebf1.json', {
    roster: rosterEntries,
});

// -----------------------------------------------------------------------------
// 7. Default-state (league=0 / season=0) calls
//
// Several components fire an initial fetch before route params have
// settled, with `league=0` (and sometimes `season=0` or `season=""`).
// Production sees a null/empty response for these too — they're
// intentionally cheap "do we have anything?" probes. Stubbing them as
// null keeps the LEAP_BROKER_FIXTURES throw from cluttering the audit
// log and lets the gap reporter focus on REAL holes in the corpus.
// -----------------------------------------------------------------------------

/** @type {Array<[string, unknown]>} */
const defaultStateStubs = [
    ['ldata-irweb__leagueRoster__6173721449.json', null], // league=0
    ['ldata-irweb__leagueSeasons__d59c844785.json', null], // league=0
    ['ldata-irweb__leagueSeasonSessions__9517d0f826.json', null], // league=0,season=0
    ['ldata-irweb__membersData__8dcef39f0f.json', null], // league=0,season=""
    ['ldata-irweb__membersData__ff19e7dbaa.json', null], // league=0,season=0
    ['ldata-rsltsts__leagueDriverStats__839a8b499f.json', null], // league=0
    ['ldata-rsltsts__leagueSimsessionIndex__beb70d7030.json', null], // league=0
    ['ldata-usrcfg__leagueTeamsInfo__66af979c52.json', null], // league=0
];
for (const [filename, value] of defaultStateStubs) {
    writeFixture(filename, value);
}

for (const [filename, value] of stubs) {
    writeFixture(filename, value);
}

// -----------------------------------------------------------------------------
// 8. Per-race simSessionResults + simsessionSummary + photoIndex
//
// `/capture-broker` only fetches the canonical Watkins Glen tuple
// (subsession 84522154). Production renders the season-schedule
// page by walking every race's results, summary, and photo index —
// each of those becomes its own broker call with a unique
// (subsession, simsession) hash. Rather than enumerating 25+ more
// tuples on the capture page, synthesize them from the schedule we
// already have: borrow the Watkins driver list, rotate finishing
// positions so each race has the correct winner from
// `leagueSeasonSessions.sessions[].winner_id`, and write a short
// AI-style race recap keyed on the track name. Same idempotency
// guarantee as the rest of this script — a live capture for any of
// these wins automatically.
// -----------------------------------------------------------------------------

const seasonSessions = readJson(
    'ldata-irweb__leagueSeasonSessions__695f72c3d8.json'
);
const watkinsResults = readJson(
    'ldata-rsltsts__simSessionResults__1ffc9a70d9.json'
);

if (
    seasonSessions?.sessions &&
    Array.isArray(watkinsResults?.results) &&
    watkinsResults.results.length > 0
) {
    const baseResults = watkinsResults.results;
    const trackHeadlines = {
        'Red Bull Ring': {
            title: 'Calloway Steals Spielberg In Final-Lap Shocker',
            highlightWord: 'Calloway',
        },
        'Mobility Resort Motegi': {
            title: 'Merchant Tames Motegi In Crosswinds',
            highlightWord: 'Merchant',
        },
        'Hockenheimring Baden-Württemberg': {
            title: 'Cawte Cracks Hockenheim Open',
            highlightWord: 'Cawte',
        },
        'Circuit Zandvoort': {
            title: 'Fitzsimmons Flies The Dunes',
            highlightWord: 'Fitzsimmons',
        },
        'St. Petersburg Grand Prix': {
            title: 'Rolls Threads The Pits Of St. Pete',
            highlightWord: 'Rolls',
        },
        'Silverstone Circuit': {
            title: 'Cawte Conducts Maggotts-Becketts Symphony',
            highlightWord: 'Cawte',
        },
        'Watkins Glen International': {
            title: 'Merchant Devours Glen, Shocks Universe',
            highlightWord: 'Merchant',
        },
    };

    /**
     * Rotate the captured Watkins finishing order so a target
     * cust_id lands at position 1. Preserves the rest of the field
     * order (and incident counts / lap times / fastest laps), which
     * is plenty to drive the table + chart layouts.
     */
    function rotateToWinner(targetCustId) {
        const ordered = baseResults.map((r) => ({ ...r }));
        const winnerIdx = ordered.findIndex(
            (r) => r.cust_id === targetCustId
        );
        if (winnerIdx < 0) return ordered;
        // Move winner to front, shift others down — only the
        // `position` field is rewritten so the visual story
        // (interval gaps, incident clusters) stays believable.
        const winner = ordered.splice(winnerIdx, 1)[0];
        ordered.unshift(winner);
        ordered.forEach((r, i) => {
            r.position = i + 1;
        });
        return ordered;
    }

    function raceRecap(trackName, winnerName) {
        const headline = trackHeadlines[trackName] || {
            title: `${winnerName.split(' ').pop()} Takes ${trackName}`,
            highlightWord: winnerName.split(' ').pop(),
        };
        return {
            title: headline.title,
            highlightWord: headline.highlightWord,
            text:
                `The Feature at ${trackName} did not lack for ` +
                `theatre. ${winnerName} controlled the front of the ` +
                `field after a tense opening sequence, while the ` +
                `midfield traded paint through the long sequences ` +
                `and the slow corners. The strategy split was wider ` +
                `than the gap between top and bottom of the table by ` +
                `the time the lead car crossed the line.\n\nA ` +
                `handful of incidents reshuffled the back third — ` +
                `the usual mix of off-track excursions and ` +
                `optimistic dive-bombs the stewards will be sifting ` +
                `through this week. Up front, ${winnerName} drove a ` +
                `mature race and never gave the chasers a sniff. ` +
                `Next round should keep the title fight on a knife ` +
                `edge.`,
        };
    }

    for (const sess of seasonSessions.sessions) {
        if (
            !sess.subsession_id ||
            !sess.has_results ||
            !sess.winner_id ||
            !sess.track?.track_name
        )
            continue;
        const sub = String(sess.subsession_id);
        const trackName = sess.track.track_name;
        const winnerName = sess.winner_name || 'The Winner';

        const raceResults = rotateToWinner(sess.winner_id);
        const raceFixture = fixtureKey('ldata-rsltsts', 'simSessionResults', {
            type: 'simSessionResults',
            subsession: sub,
            simsession: '0',
        });
        writeFixture(`${raceFixture}.json`, {
            subsession_id: sess.subsession_id,
            simsession_number: 0,
            results: raceResults,
        });

        // Sprint usually has a different lead. Borrow the runner-up
        // from the race to make it feel non-redundant.
        const sprintLeader =
            raceResults[1]?.cust_id ?? raceResults[0]?.cust_id;
        const sprintResults = rotateToWinner(sprintLeader);
        const sprintFixture = fixtureKey('ldata-rsltsts', 'simSessionResults', {
            type: 'simSessionResults',
            subsession: sub,
            simsession: '-2',
        });
        writeFixture(`${sprintFixture}.json`, {
            subsession_id: sess.subsession_id,
            simsession_number: -2,
            results: sprintResults,
        });

        const summaryFixture = fixtureKey('ldata-gentxt', 'simsessionSummary', {
            type: 'simsessionSummary',
            subsession: sub,
            simsession: '0',
        });
        writeFixture(`${summaryFixture}.json`, raceRecap(trackName, winnerName));

        const photoFixture = fixtureKey('ldata-photos', 'photoIndex', {
            type: 'photoIndex',
            subsession: sub,
            simsession: '0',
        });
        // No photo pipeline in this league — empty index is the
        // honest response. The component degrades gracefully when
        // there's nothing to show.
        writeFixture(`${photoFixture}.json`, []);
    }
}

// -----------------------------------------------------------------------------
// 9. Cross-season membersData fallbacks
//
// Pages that surface historical seasons (driver profile, results
// detail) probe membersData for each prior season. Production
// returns the same roster shape; we reuse the captured one so the
// pages stop emitting "missing fixture" warnings — it's only the
// names that bleed into older-season views, and they're the same
// anonymized roster.
// -----------------------------------------------------------------------------

const currentMembers = readJson('ldata-irweb__membersData__95a253d21c.json');
if (currentMembers) {
    for (const priorSeason of ['118784', '122101', '125220', '128679']) {
        const fname =
            fixtureKey('ldata-irweb', 'membersData', {
                type: 'membersData',
                league: String(LEAGUE_ID),
                season: priorSeason,
            }) + '.json';
        writeFixture(fname, currentMembers);
    }
    // Default-state (no params at all) membersData probe — null is
    // what production returns until a league is selected.
    const emptyFname =
        fixtureKey('ldata-irweb', 'membersData', { type: 'membersData' }) +
        '.json';
    writeFixture(emptyFname, null);
}

console.log(`[synth] done. ${written} file(s) written, ${skipped} unchanged.`);
