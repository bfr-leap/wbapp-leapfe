# Architecture Recommendations

Analysis of the wbapp-leapfe codebase with recommendations to improve maintainability, testability, and AI-tool friendliness.

---

## What's Working Well

Before diving into improvements, it's worth noting the strengths of the current architecture:

- **Model-first pattern** - Clean separation between data logic (`src/models/`) and UI (`src/components/`). This is a strong foundation.
- **Centralized data fetching** - All API calls flow through `fetch-util.ts`, making the data layer predictable.
- **Domain-organized components** - Components grouped by domain (driver, team, event, vis) makes navigation intuitive.
- **Consistent naming** - File and function naming is predictable and easy to follow.

---

## Recommendations

### 1. Add a Testing Foundation (High Priority)

**Problem:** The codebase has essentially zero test coverage (1 placeholder test for HelloWorld). The model files contain significant business logic for data transformation, sorting, and filtering — all untested.

**Recommendation:**

- Add Vitest as a devDependency (it's already implied by the existing test but not in package.json)
- Start with **model tests** — these are pure async functions that are the easiest to test and contain the most critical logic
- Add **utility tests** for `driver-utils.ts`, `results-util.ts`, `session-utils.ts`, `track-utils.ts`
- Add a `test` script to `package.json`

**Suggested structure:**
```
src/
  models/
    driver/
      driver-standings-model.ts
      driver-standings-model.test.ts    # Co-located test
  utils/
    fetch-util.ts
    fetch-util.test.ts                  # Co-located test
    driver-utils.ts
    driver-utils.test.ts
```

**Why this helps AI tools:** Tests act as executable specifications. AI tools can run tests to validate changes, catch regressions, and understand expected behavior. Without tests, AI tools are flying blind.

---

### 2. Add ESLint with TypeScript Rules (High Priority)

**Problem:** No linting beyond Prettier formatting. TypeScript has 60+ uses of `any`, and there's no enforcement of code quality rules (unused variables, missing return types, etc.).

**Recommendation:**

- Install `@nuxt/eslint` (the official Nuxt ESLint integration)
- Enable TypeScript-aware rules, especially `no-explicit-any` as a warning to start
- Add a `lint` script to `package.json`
- Consider adding `lint-staged` + `husky` for pre-commit checks

**Why this helps AI tools:** Linting provides immediate feedback on code quality. AI tools can run the linter to verify their changes meet project standards.

---

### 3. Refactor `fetch-util.ts` — Break Up the 661-line Monolith (High Priority)

**Problem:** `fetch-util.ts` is the largest file in the codebase and serves too many roles:
- Low-level HTTP fetching with auth
- In-memory caching with promise deduplication
- Domain-specific data accessors (getLeagueSeasons, getSimsessionResults, etc.)
- User state management (getUserLeaguesState, setUserLeaguesState)
- Prefetching orchestration

**Recommendation:** Split into focused modules:

```
src/utils/
  api-client.ts           # Low-level fetch with auth headers
  cache.ts                # Cache storage and promise deduplication
  prefetch.ts             # Prefetch orchestration

src/services/
  league-service.ts       # getLeagueSeasons, getLeagueMembers, etc.
  results-service.ts      # getSimsessionResults, getSeasonResults, etc.
  user-service.ts         # getUserLeaguesState, setUserLeaguesState, etc.
  driver-service.ts       # getDriverInfo, setIrLinkDriver, etc.
```

**Migration path:** This can be done incrementally. Start by extracting the domain-specific accessor functions into service files that import from the core `api-client.ts`. The existing functions can be re-exported from `fetch-util.ts` during transition.

**Why this helps AI tools:** Smaller, focused files are dramatically easier for AI tools to understand and modify. A 661-line file with mixed concerns is one of the hardest things for any developer (human or AI) to work with safely.

---

### 4. Move Cache State to Pinia (Medium Priority)

**Problem:** Caching state lives in module-level variables in `fetch-util.ts` (`_cacheStorage`, `_prefetchPromise`, `_userLeagueStateCache`, timers). This is invisible to Vue devtools, hard to debug, and impossible to reset during testing.

**Recommendation:**

- Create a `useCacheStore` Pinia store for API response caching
- Create a `useUserStore` Pinia store for user-related state
- This makes state visible in Vue Devtools and resettable in tests via `store.$reset()`

**Why this helps testing:** Pinia stores can be reset between tests, eliminating flaky tests caused by shared mutable state.

---

### 5. Reduce `any` Usage (Medium Priority)

**Problem:** ~60 uses of `any` across the codebase, concentrated in:
- D3 scale types
- API response types in fetch-util
- Promise wrapping

**Recommendation:**

- Create a `src/types/d3.ts` file with proper D3 scale type definitions
- Type API responses properly using the existing `lplib/endpoint-types/` definitions
- Replace `Promise<any>` with `Promise<unknown>` as a first step, then add proper generics

**Start with fetch-util.ts** — typing the core data layer pays dividends across the entire codebase.

---

### 6. Add Error States to the UI (Medium Priority)

**Problem:** Most errors are silently swallowed or logged to console. Users see blank/broken UI when data fails to load, with no indication of what went wrong.

**Recommendation:**

- Add error return values to model functions (e.g., `{ data: T | null, error: string | null }`)
- Create a simple `<error-banner>` component for displaying errors
- Use the `asyncDataWithReactiveModel` composable's error handling capabilities

---

### 7. Extract D3 Logic from Chart Components (Low Priority)

**Problem:** Chart components (`line-chart.vue` at 423 lines, `bar-chart.vue` at 321 lines) mix D3 DOM manipulation with Vue component logic.

**Recommendation:**

- Extract D3 rendering into utility functions: `src/utils/d3/line-chart-renderer.ts`
- Components become thin wrappers that pass data to renderers
- Renderers become testable without Vue Test Utils

---

### 8. Strengthen TypeScript Configuration (Low Priority)

**Problem:** `tsconfig.json` only extends the Nuxt-generated config with no project-level overrides. Key strict-mode options may not be enabled.

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

## Implementation Order

A suggested order that maximizes value while minimizing disruption:

| Phase | Task | Impact |
|-------|------|--------|
| 1 | Add CLAUDE.md (done) | Immediate AI-tool benefit |
| 2 | Add ESLint + `lint` script | Immediate quality guardrails |
| 3 | Add Vitest config + test script + first model tests | Testing foundation |
| 4 | Split `fetch-util.ts` into focused modules | Maintainability leap |
| 5 | Move cache to Pinia stores | Testability + debuggability |
| 6 | Reduce `any` usage in core data layer | Type safety |
| 7 | Add error states to models and UI | User experience |
| 8 | Extract D3 renderers | Component simplicity |

Phases 1-3 can be done in a day and immediately improve the development experience. Phases 4-5 are the highest-impact refactors but require more careful migration. Phases 6-8 are ongoing improvements.

---

## Making the Codebase AI-Friendly

The `CLAUDE.md` file added alongside this document provides AI tools with:
- Architecture overview and data flow
- Key patterns and conventions
- Directory structure guide
- Common commands

Additional steps that help AI tools work effectively:
1. **Tests** — AI tools use tests as validation. Without them, changes are risky.
2. **Linting** — Provides immediate feedback on code quality.
3. **Smaller files** — Files under 200 lines are dramatically easier for AI to reason about.
4. **Strong types** — AI tools generate better code when types are explicit.
5. **Consistent patterns** — The model-first pattern is already great for this. Keep enforcing it.
