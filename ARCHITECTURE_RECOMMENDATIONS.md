# Architecture Recommendations

Progress tracker for improving maintainability, testability, and AI-tool friendliness of the wbapp-leapfe codebase.

---

## Completed (This PR)

### 1. CLAUDE.md Project Guide
Added `CLAUDE.md` with architecture overview, data flow, conventions, and common commands for AI-tool and developer onboarding.

### 2. ESLint with TypeScript Rules
Installed `@nuxt/eslint` with TypeScript-aware rules. Added `lint` and `lint:fix` scripts to `package.json`.

### 3. Testing Foundation
- Added Vitest with `vitest.config.ts`, `test` and `test:watch` scripts
- Co-located test files following `*.test.ts` convention
- Tests added: `driver-standings-model`, `pace-chart-model`, `async-data-with-reactive-model`, `api-client`, `driver-utils`, `hash-util`
- 7 test files, 50 tests passing

### 4. Split `fetch-util.ts` into Focused Modules
Extracted the monolithic `fetch-util.ts` into a layered architecture:

```
src/utils/api-client.ts        # Core fetch with auth, caching, promise deduplication
src/services/
  league-service.ts            # League metadata, seasons, members, teams, tracks
  results-service.ts           # Race results, driver stats, charts, telemetry
  user-service.ts              # User state, features, iRacing account linking
  admin-service.ts             # Admin schedule CRUD operations
  index.ts                     # Barrel re-export
```

`fetch-util.ts` retained as a backwards-compatible re-export layer.

### 5. Eliminated `any` Types
Removed all `any` usage from `src/` by leveraging `iracing-endpoints` type definitions. Components, models, services, and utilities are now fully typed.

### 6. Bug Fixes
- Fixed pace bar charts not rendering on qualifying event views
- Fixed wrong subsession loading and `structuredClone` errors
- Fixed league change not updating `LeagueSeasonMenu` and `DriverStandings`
- Cleaned up dead code, debug logs, and deep-clone anti-patterns

---

## Next Steps (Future PRs)

### 1. Move Cache State to Pinia (Medium Priority)

**Problem:** Caching state lives in module-level variables in `api-client.ts` (`_cacheStorage`, `_prefetchPromise`, timers). This is invisible to Vue DevTools, hard to debug, and impossible to reset during testing.

**Recommendation:**

- Create a `useCacheStore` Pinia store for API response caching
- Create a `useUserStore` Pinia store for user-related state
- Makes state visible in Vue DevTools and resettable in tests via `store.$reset()`

---

### 2. Expand Test Coverage (Medium Priority)

**Problem:** Testing foundation is in place but coverage is limited to 7 files. Key untested areas include remaining models, service modules, and composables.

**Recommendation:**

- Add tests for all model files (`home-model`, `results-model`, `league-roster-model`, etc.)
- Add tests for service modules (`league-service`, `results-service`, `user-service`)
- Add tests for utility modules (`session-utils`, `track-utils`, `results-util`)
- Target: every `src/models/**/*-model.ts` and `src/services/*.ts` file has a co-located test

---

### 3. Add Error States to the UI (Medium Priority)

**Problem:** Most errors are silently swallowed or logged to console. Users see blank/broken UI when data fails to load, with no indication of what went wrong.

**Recommendation:**

- Add error return values to model functions (e.g., `{ data: T | null, error: string | null }`)
- Create a simple `<error-banner>` component for displaying errors
- Use the `asyncDataWithReactiveModel` composable's error handling capabilities

---

### 4. Complete `fetch-util.ts` Migration (Medium Priority)

**Problem:** `fetch-util.ts` still exists as a re-export layer for backwards compatibility. Components and models still import from it.

**Recommendation:**

- Update all imports across the codebase to use specific service modules directly
- Remove `fetch-util.ts` once all consumers are migrated
- This is a mechanical change but touches many files

---

### 5. Extract D3 Logic from Chart Components (Low Priority)

**Problem:** Chart components (`line-chart.vue`, `bar-chart.vue`) mix D3 DOM manipulation with Vue component logic, making them large and hard to test.

**Recommendation:**

- Extract D3 rendering into utility functions: `src/utils/d3/line-chart-renderer.ts`
- Components become thin wrappers that pass data to renderers
- Renderers become testable without Vue Test Utils

---

### 6. Strengthen TypeScript Configuration (Low Priority)

**Problem:** `tsconfig.json` only extends the Nuxt-generated config with no project-level overrides. Strict mode may not be fully enabled.

**Recommendation:** Add stricter options incrementally:
```json
{
    "extends": "./.nuxt/tsconfig.json",
    "compilerOptions": {
        "strict": true,
        "noUncheckedIndexedAccess": true
    }
}
```

Start with `strict: true` and fix the resulting type errors. This prevents entire categories of bugs.

---

### 7. Add `lint-staged` + `husky` for Pre-commit Checks (Low Priority)

**Problem:** ESLint and Prettier are available but not enforced automatically. Developers can commit code that doesn't pass linting.

**Recommendation:**

- Install `husky` and `lint-staged`
- Configure pre-commit hook to run ESLint and Prettier on staged files
- Ensures consistent code quality without manual effort

---

## Summary

| # | Task | Status | Priority |
|---|------|--------|----------|
| 1 | Add CLAUDE.md | Done | - |
| 2 | Add ESLint + lint scripts | Done | - |
| 3 | Add Vitest + initial tests | Done | - |
| 4 | Split `fetch-util.ts` into services | Done | - |
| 5 | Eliminate `any` types | Done | - |
| 6 | Bug fixes (reactivity, rendering) | Done | - |
| 7 | Move cache to Pinia stores | Next | Medium |
| 8 | Expand test coverage | Next | Medium |
| 9 | Add error states to UI | Next | Medium |
| 10 | Complete `fetch-util.ts` migration | Next | Medium |
| 11 | Extract D3 renderers | Next | Low |
| 12 | Strengthen TypeScript config | Next | Low |
| 13 | Add pre-commit hooks | Next | Low |
