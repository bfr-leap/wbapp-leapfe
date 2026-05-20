/**
 * Declarative manifest of routes the visual audit captures.
 *
 * Each entry produces N screenshots (one per viewport in
 * `viewports.mjs`, or per the route's own `viewports` override) plus
 * — when `captureOg !== false` — one Satori-rendered OG card PNG. The
 * manifest.json that lands next to the screenshots mirrors this list
 * so a reviewing agent can map every file back to its source URL,
 * intent, and what to look for.
 *
 * URLs intentionally use the same query parameters as
 * `tests/_smoke-helpers.ts SMOKE_URLS`, because those are the values
 * for which `tests/fixtures/broker/*.json` was recorded. Adding a
 * route that hits a fixture-less broker tuple will fail loudly under
 * `LEAP_BROKER_FIXTURES` — that's the signal to either capture a new
 * fixture (sign-in to a preview, visit `/capture-broker`, run
 * `scripts/import-broker-fixtures.mjs`) or hand-author one.
 *
 * `slug` is what shows up in filenames; keep it short, kebab-case,
 * and unique across the manifest.
 */

/**
 * @typedef {'main' | 'admin' | 'embed' | 'auth'} RouteSection
 */

/**
 * @typedef {Object} AuditRoute
 * @property {string} slug
 *   Stable identifier — used as a filename prefix. Must be unique.
 * @property {string} label
 *   Human-readable description for the manifest JSON.
 * @property {string} url
 *   Path + query starting with `/`. Passed directly to
 *   `page.goto(base + url)`.
 * @property {RouteSection} section
 *   Coarse grouping so an agent can scan related captures together.
 * @property {string} [notes]
 *   What a reviewer should pay attention to on this page. Surfaced
 *   in the manifest verbatim.
 * @property {string[]} [viewports]
 *   Restrict capture to a subset of viewport names (default: all).
 * @property {boolean} [captureOg]
 *   Whether to also fetch + save the Satori-rendered OG card.
 *   Defaults to true. Set false for routes whose OG card doesn't
 *   render meaningfully (e.g. embeds, auth).
 * @property {string} [waitFor]
 *   Optional CSS selector to wait for before screenshotting. Default
 *   waits for `body` + fonts + a short settle delay. Override when a
 *   specific component drives the visual identity of the page.
 */

/** @type {AuditRoute[]} */
export const ROUTES = [
    {
        slug: 'home-bare',
        label: 'Home (no league/season hints)',
        url: '/',
        section: 'main',
        notes: 'The anonymous landing case. Hero, latest race summary, standings teaser.',
    },
    {
        slug: 'home',
        label: 'Home (league + season selected)',
        url: '/?league=4534&season=131502',
        section: 'main',
        notes: 'Logged-in-feeling home for a specific league/season. The default visual reference.',
    },
    {
        slug: 'results',
        label: 'Race results — single subsession',
        url: '/?m=results&league=4534&season=131502&subsession=84522154&simsession=0',
        section: 'main',
        notes: 'Includes track-banner hero (background photo + logo + SVG map), finishing-order table, and inline charts.',
    },
    {
        slug: 'standings',
        label: 'Driver standings',
        url: '/?m=standings&league=4534&season=131502',
        section: 'main',
        notes: 'Pure data table page. Watch row density and stripe contrast across viewports.',
    },
    {
        slug: 'season',
        label: 'Season profile',
        url: '/?m=season&league=4534&season=131502',
        section: 'main',
        notes: 'Schedule, calendar, team grid. Heaviest mix of card components on a single page.',
    },
    {
        slug: 'rulings',
        label: 'Steward rulings',
        url: '/?m=rulings&league=4534&season=131502',
        section: 'main',
        notes: 'List of rulings — text-heavy. Tests typography and dark-mode contrast away from chart pages.',
    },
    {
        slug: 'driver',
        label: 'Driver profile',
        url: '/?m=driver&league=4534&driver=174470',
        section: 'main',
        notes: 'Per-driver landing. Currently uses the generic helmet.png — top candidate for per-driver helmet SVG identity.',
    },
];

export const ROUTE_SLUGS = ROUTES.map((r) => r.slug);
