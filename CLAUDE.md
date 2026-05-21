# CLAUDE.md - Project Guide

## Overview

iRacing league analytics application built with **Nuxt 3** (Vue 3). Displays driver standings, race results, team data, and visualizations for sim-racing leagues.

## Tech Stack

-   **Framework:** Nuxt 3.12 (Vue 3, Nitro server, file-based routing)
-   **Auth:** Clerk (vue-clerk frontend, h3-clerk server middleware)
-   **Backend data:** LEAP Data Broker REST service (read + write), plus a static JSON "data lake" on GitHub Pages
-   **State:** Pinia (underutilized - most state lives in api-client cache)
-   **Visualization:** D3.js v7
-   **Styling:** Bootstrap 5 via CDN with custom dark theme
-   **Analytics:** Mixpanel
-   **Testing:** Vitest + @vue/test-utils + happy-dom
-   **Linting:** ESLint via @nuxt/eslint + Prettier

## Architecture

### Data Flow

```
Vue Component → Model function → Service module → api-client.ts → /api/fetch-document (Nitro)
                                                                 → /api/prefetch-load
                                                                         ↓
                                                               lplib/dtbrkr/ftchdata.ts
                                                                         ↓
                                                               LEAP Data Broker REST API
                                                               + static data lake (GitHub Pages JSON)
```

### Key Patterns

-   **Model-first:** Components delegate data fetching/transformation to `src/models/**/*-model.ts` files. Models return typed objects that components render.
-   **Service layer:** Domain-specific data accessors in `src/services/` wrap the core `api-client.ts`.
-   **Namespace-based queries:** All data fetched via `fetchCachedDocument({ namespace, type, ...params })`.
-   **SSR composable:** `asyncDataWithReactiveModel()` wraps model functions for SSR-safe reactive data.
-   **Path alias:** Use `@@/src/` for imports from the src directory.

### Directory Structure

```
src/
  components/    # Vue SFCs organized by domain (driver/, team/, event/, vis/, etc.)
  models/        # Data fetching + transformation logic (one per component/page)
  services/      # Domain-specific data access (league, results, user, admin)
  utils/         # Shared utilities (api-client.ts is the core data layer)
  stores/        # Pinia stores (currently minimal)
  assets/        # CSS, images, fonts

pages/           # Nuxt file-based routes (index, sign-in, sign-up)
server/api/      # Nitro API endpoints
composables/     # Vue composables (async-data, auth-state)
plugins/         # Nuxt plugins (Clerk init)
middleware/      # Route middleware (auth)
lplib/           # Shared types and data broker
```

### Service Modules

Data access is organized by domain in `src/services/`:

| Module               | Responsibility                                   |
| -------------------- | ------------------------------------------------ |
| `league-service.ts`  | League metadata, seasons, members, teams, tracks |
| `results-service.ts` | Race results, driver stats, charts, telemetry    |
| `user-service.ts`    | User state, features, iRacing account linking    |
| `admin-service.ts`   | Admin schedule CRUD operations                   |

`src/utils/fetch-util.ts` re-exports everything for backwards compatibility. **New code should import from specific service modules.**

### Conventions

-   **Formatting:** Prettier - 4-space indent, single quotes, trailing commas, semicolons, 80-char width
-   **Linting:** ESLint via @nuxt/eslint (config in `eslint.config.mjs`)
-   **Component naming:** kebab-case filenames (e.g., `driver-standings.vue`)
-   **Model naming:** `*-model.ts` files export a `get*Model()` async function
-   **Test naming:** Co-located `*.test.ts` files next to the source file

## Common Commands

```bash
npm run dev            # Start dev server (via vercel dev)
npm run start          # Start Nuxt dev server
npm run build          # Production build
npm run generate       # Static site generation
npm run preview        # Preview production build
npm run test           # Run tests once
npm run test:watch     # Run tests in watch mode
npm run test:smoke     # SSR smoke pass against the fixture corpus
npm run lint           # Lint all files
npm run lint:fix       # Lint and auto-fix
npm run prettier       # Format all files
npm run prettier-check # Check formatting
npm run audit          # Build + capture every page × viewport into audit/output/
npm run audit:capture  # Capture only (skip build); use during iteration
```

## Visual audit + broker fixtures

`npm run audit` is the headless screenshot tool. It boots the
production build with `LEAP_BROKER_FIXTURES` pointed at
`tests/fixtures/broker/`, then drives Playwright through every
(route × viewport) pair declared in `audit/routes.mjs` ×
`audit/viewports.mjs`, plus the Satori-rendered OG card for each
route. Output lands in `audit/output/<timestamp>/` (gitignored)
with a `manifest.json` mapping each PNG back to its source URL and
review notes. Intended consumer: an AI agent doing visual / UX
review of a branch.

Common invocations:

```bash
node audit/capture.mjs --routes=home,results            # narrow routes
node audit/capture.mjs --viewports=mbp-full             # narrow viewports
node audit/capture.mjs --skip-og                        # screenshots only
node audit/capture.mjs --out=/tmp/leap-audit            # custom output dir
```

### Fixture corpus & filename scheme

Every broker call is keyed by `<namespace>__<type>__<10-char-sha1>.json`
where the hash is over the canonical `k=v&k=v&...` form of the
query params (excluding `namespace`, `userID`, `_authHeader`, and
empty values). `server/api/fetch-document.ts` computes the key on
both record and replay; `scripts/import-broker-fixtures.mjs` and
`audit/synthesize-fixtures.mjs` mirror the algorithm.

`audit/capture.mjs` reports gaps as `missing-fixtures.json` next to
the manifest — each entry carries the full query so a follow-up step
can populate the fixture without guessing the filename.

### Refreshing fixtures (from real broker data)

1. Sign in to a deployed preview, visit `/capture-broker`.
2. Wait for every tuple row to flip to `ok` (errors surface inline).
3. Click "Copy JSON to clipboard" — the page anonymizes in-browser
   before composing the blob (cust_ids → synthetic numbers, names
   → `Driver N`).
4. Pipe back through `node scripts/import-broker-fixtures.mjs < blob.json`.

If the audit run surfaces a tuple not yet in `pages/capture-broker.vue`,
add it to `TUPLES` there and re-capture.

### Filling gaps (no live data available)

`node audit/synthesize-fixtures.mjs` writes minimal-valid stubs for
the gaps the audit normally surfaces (default-state probes, null
chart endpoints, empty per-driver session results). It will
**never overwrite an existing fixture**, so it's safe to re-run
after a capture import — anything captured live wins.

### Smoke tests share the corpus

`npm run test:smoke` (`tests/ssr-smoke-fixtures.test.ts`) boots the
same prod build with the same fixture mode and asserts every
shareable URL in `tests/_smoke-helpers.ts SMOKE_URLS` returns
non-5xx HTML and embeds a valid OG card payload. When you add a
new shareable surface, update both `audit/routes.mjs` and
`SMOKE_URLS`.

## Environment Variables

Required in `.env`:

-   `CLERK_PUBLISHABLE_KEY` - Clerk frontend key
-   `CLERK_SECRET_KEY` - Clerk backend key
-   `CLERK_JWT_KEY` - JWT verification key
-   `API_BASE_URL` - API base URL (defaults to http://localhost:3000)
