# CLAUDE.md - Project Guide

## Overview

iRacing league analytics application built with **Nuxt 3** (Vue 3). Displays driver standings, race results, team data, and visualizations for sim-racing leagues.

## Tech Stack

- **Framework:** Nuxt 3.12 (Vue 3, Nitro server, file-based routing)
- **Auth:** Clerk (vue-clerk frontend, h3-clerk server middleware)
- **Database:** Xata (serverless, accessed via `@xata.io/client`)
- **State:** Pinia (underutilized - most state lives in fetch-util cache)
- **Visualization:** D3.js v7
- **Styling:** Bootstrap 5 via CDN with custom dark theme
- **Analytics:** Mixpanel

## Architecture

### Data Flow

```
Vue Component → Model function → fetch-util.ts → /api/fetch-document (Nitro)
                                                → /api/prefetch-load
                                                        ↓
                                              lplib/dtbrkr/ftchdata.ts
                                                        ↓
                                              External APIs (iRacing, Xata)
```

### Key Patterns

- **Model-first:** Components delegate data fetching/transformation to `src/models/**/*-model.ts` files. Models return typed objects that components render.
- **Namespace-based queries:** All data fetched via `fetchCachedDocument({ namespace, type, ...params })`.
- **SSR composable:** `asyncDataWithReactiveModel()` wraps model functions for SSR-safe reactive data.
- **Path alias:** Use `@@/src/` for imports from the src directory.

### Directory Structure

```
src/
  components/    # Vue SFCs organized by domain (driver/, team/, event/, vis/, etc.)
  models/        # Data fetching + transformation logic (one per component/page)
  utils/         # Shared utilities (fetch-util.ts is the core data layer)
  stores/        # Pinia stores (currently minimal)
  assets/        # CSS, images, fonts

pages/           # Nuxt file-based routes (index, sign-in, sign-up)
server/api/      # Nitro API endpoints
composables/     # Vue composables (async-data, auth-state)
plugins/         # Nuxt plugins (Clerk init)
middleware/      # Route middleware (auth)
lplib/           # Shared types and data broker
```

### Conventions

- **Formatting:** Prettier - 4-space indent, single quotes, trailing commas, semicolons, 80-char width
- **Component naming:** kebab-case filenames (e.g., `driver-standings.vue`)
- **Model naming:** `*-model.ts` files export a `get*Model()` async function
- **No ESLint** currently configured

## Common Commands

```bash
npm run dev          # Start dev server (via vercel dev)
npm run start        # Start Nuxt dev server
npm run build        # Production build
npm run generate     # Static site generation
npm run preview      # Preview production build
npm run prettier     # Format all files
npm run prettier-check  # Check formatting
```

## Environment Variables

Required in `.env`:
- `CLERK_PUBLISHABLE_KEY` - Clerk frontend key
- `CLERK_SECRET_KEY` - Clerk backend key
- `CLERK_JWT_KEY` - JWT verification key
- `API_BASE_URL` - API base URL (defaults to http://localhost:3000)
