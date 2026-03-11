# CLAUDE.md - Project Guide

## Overview

iRacing league analytics application built with **Nuxt 3** (Vue 3). Displays driver standings, race results, team data, and visualizations for sim-racing leagues.

## Tech Stack

- **Framework:** Nuxt 3.12 (Vue 3, Nitro server, file-based routing)
- **Auth:** Clerk (vue-clerk frontend, h3-clerk server middleware)
- **Database:** Xata (serverless, accessed via `@xata.io/client`)
- **State:** Pinia (underutilized - most state lives in api-client cache)
- **Visualization:** D3.js v7
- **Styling:** Bootstrap 5 via CDN with custom dark theme
- **Analytics:** Mixpanel
- **Testing:** Vitest + @vue/test-utils + happy-dom
- **Linting:** ESLint via @nuxt/eslint + Prettier

## Architecture

### Data Flow

```
Vue Component → Model function → Service module → api-client.ts → /api/fetch-document (Nitro)
                                                                 → /api/prefetch-load
                                                                         ↓
                                                               lplib/dtbrkr/ftchdata.ts
                                                                         ↓
                                                               External APIs (iRacing, Xata)
```

### Key Patterns

- **Model-first:** Components delegate data fetching/transformation to `src/models/**/*-model.ts` files. Models return typed objects that components render.
- **Service layer:** Domain-specific data accessors in `src/services/` wrap the core `api-client.ts`.
- **Namespace-based queries:** All data fetched via `fetchCachedDocument({ namespace, type, ...params })`.
- **SSR composable:** `asyncDataWithReactiveModel()` wraps model functions for SSR-safe reactive data.
- **Path alias:** Use `@@/src/` for imports from the src directory.

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

| Module | Responsibility |
|--------|---------------|
| `league-service.ts` | League metadata, seasons, members, teams, tracks |
| `results-service.ts` | Race results, driver stats, charts, telemetry |
| `user-service.ts` | User state, features, iRacing account linking |
| `admin-service.ts` | Admin schedule CRUD operations |

`src/utils/fetch-util.ts` re-exports everything for backwards compatibility. **New code should import from specific service modules.**

### Conventions

- **Formatting:** Prettier - 4-space indent, single quotes, trailing commas, semicolons, 80-char width
- **Linting:** ESLint via @nuxt/eslint (config in `eslint.config.mjs`)
- **Component naming:** kebab-case filenames (e.g., `driver-standings.vue`)
- **Model naming:** `*-model.ts` files export a `get*Model()` async function
- **Test naming:** Co-located `*.test.ts` files next to the source file

## Common Commands

```bash
npm run dev            # Start dev server (via vercel dev)
npm run start          # Start Nuxt dev server
npm run build          # Production build
npm run generate       # Static site generation
npm run preview        # Preview production build
npm run test           # Run tests once
npm run test:watch     # Run tests in watch mode
npm run lint           # Lint all files
npm run lint:fix       # Lint and auto-fix
npm run prettier       # Format all files
npm run prettier-check # Check formatting
```

## Environment Variables

Required in `.env`:
- `CLERK_PUBLISHABLE_KEY` - Clerk frontend key
- `CLERK_SECRET_KEY` - Clerk backend key
- `CLERK_JWT_KEY` - JWT verification key
- `API_BASE_URL` - API base URL (defaults to http://localhost:3000)
