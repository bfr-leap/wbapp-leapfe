import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref, nextTick, reactive } from 'vue';

// Mock useAsyncData (Nuxt auto-import, not available in vitest)
const mockUseAsyncData = vi.fn();
vi.stubGlobal('useAsyncData', mockUseAsyncData);

import {
    asyncDataWithReactiveModel,
    asyncDataWithReactiveModelResult,
} from '@@/composables/async-data-with-reactive-model';

function setupMockUseAsyncData() {
    mockUseAsyncData.mockImplementation(
        async (_key: string, fn: () => Promise<unknown>) => {
            const result = await fn();
            return {
                data: ref(result),
                pending: ref(false),
                error: ref(null),
            };
        }
    );
}

// Helper: wait for async watch callbacks to complete
async function flushWatchers(ms = 100) {
    await nextTick();
    await new Promise((r) => setTimeout(r, ms));
    await nextTick();
}

describe('asyncDataWithReactiveModel - watch behavior', () => {
    beforeEach(() => {
        mockUseAsyncData.mockReset();
    });

    it('fires watch when 2 observables change', async () => {
        setupMockUseAsyncData();
        const props = reactive({ league: '637', season: '108750' });
        const fetchFn = vi.fn(async () => ({
            leagueId: props.league,
            seasonId: props.season,
        }));

        await asyncDataWithReactiveModel(
            'test-2obs',
            fetchFn,
            () => ({ leagueId: '', seasonId: '' }),
            [() => props.league, () => props.season]
        );

        expect(fetchFn).toHaveBeenCalledTimes(1);

        // Change both observables
        props.league = '4534';
        props.season = '105035';
        await flushWatchers();

        expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it('fires watch when 3 observables change (2 dynamic, 1 static)', async () => {
        setupMockUseAsyncData();
        const props = reactive({
            league: '637',
            season: '108750',
            targetPage: '',
        });
        const fetchFn = vi.fn(async () => ({
            leagueId: props.league,
            seasonId: props.season,
        }));

        await asyncDataWithReactiveModel(
            'test-3obs',
            fetchFn,
            () => ({ leagueId: '', seasonId: '' }),
            [() => props.league, () => props.season, () => props.targetPage]
        );

        expect(fetchFn).toHaveBeenCalledTimes(1);

        // Change 2 of 3 observables (targetPage stays static)
        props.league = '4534';
        props.season = '105035';
        await flushWatchers();

        expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it('fires watch when 3 observables change (2 dynamic, 1 boolean)', async () => {
        setupMockUseAsyncData();
        const props = reactive({
            league: '637',
            season: '108750',
            summaryMode: true as boolean,
        });
        const fetchFn = vi.fn(async () => ({
            leagueId: props.league,
            seasonId: props.season,
        }));

        await asyncDataWithReactiveModel(
            'test-3obs-bool',
            fetchFn,
            () => ({ leagueId: '', seasonId: '' }),
            [() => props.league, () => props.season, () => props.summaryMode]
        );

        expect(fetchFn).toHaveBeenCalledTimes(1);

        // Change 2 of 3 (summaryMode stays true)
        props.league = '4534';
        props.season = '105035';
        await flushWatchers();

        expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it('refetch returns updated data via the model ref', async () => {
        setupMockUseAsyncData();
        const props = reactive({ league: '637', season: '108750' });
        const fetchFn = vi.fn(async () => ({
            leagueId: props.league,
            seasonId: props.season,
        }));

        const model = await asyncDataWithReactiveModel(
            'test-ref-update',
            fetchFn,
            () => ({ leagueId: '', seasonId: '' }),
            [() => props.league, () => props.season]
        );

        expect(model.value).toEqual({
            leagueId: '637',
            seasonId: '108750',
        });

        props.league = '4534';
        props.season = '105035';
        await flushWatchers();

        expect(model.value).toEqual({
            leagueId: '4534',
            seasonId: '105035',
        });
    });

    it('fires watch when query-style getter observables change (route.query pattern)', async () => {
        setupMockUseAsyncData();
        // Simulate the route.query pattern used in HomeView
        const query = reactive({
            m: '' as string,
            league: '4534',
            season: '128679',
            subsession: '83319765',
            simsession: '0',
        });
        const fetchFn = vi.fn(async () => ({
            league_id: Number(query.league),
            season_id: Number(query.season),
            subsession_id: Number(query.subsession),
            simsession_id: Number(query.simsession),
        }));

        const model = await asyncDataWithReactiveModel(
            'test-route-query',
            fetchFn,
            () => ({
                league_id: 0,
                season_id: 0,
                subsession_id: 0,
                simsession_id: 0,
            }),
            [
                () => query.m,
                () => query.league,
                () => query.season,
                () => query.subsession,
                () => query.simsession,
            ]
        );

        expect(fetchFn).toHaveBeenCalledTimes(1);
        expect(model.value.subsession_id).toBe(83319765);

        // Navigate to a different subsession (simulates clicking a past event)
        query.m = 'results';
        query.subsession = '84059465';
        await flushWatchers();

        expect(fetchFn).toHaveBeenCalledTimes(2);
        expect(model.value.subsession_id).toBe(84059465);
    });

    it('reproduces stale subsession when API returns default context (HomeView bug)', async () => {
        setupMockUseAsyncData();
        // Simulate route.query — home page has no subsession in URL
        const query = reactive({
            m: '' as string,
            league: '4534',
            season: '128679',
            subsession: '' as string, // no subsession on home page
            simsession: '' as string,
        });

        // Simulate defLgSeasSubCtx: API always returns the LATEST
        // subsession as the default, regardless of the subsession param.
        // This is the "default context" endpoint behavior.
        const LATEST_SUBSESSION = 84059465;
        const CLICKED_SUBSESSION = 83319765;

        // BUG version: fetch returns API default, does NOT override from URL
        const buggyFetchFn = vi.fn(async () => ({
            league_id: 4534,
            season_id: 128679,
            subsession_id: LATEST_SUBSESSION, // API always returns latest
            simsession_id: 0,
        }));

        const buggyModel = await asyncDataWithReactiveModel(
            'test-stale-buggy',
            buggyFetchFn,
            () => ({
                league_id: 0,
                season_id: 0,
                subsession_id: 0,
                simsession_id: 0,
            }),
            [
                () => query.m,
                () => query.league,
                () => query.season,
                () => query.subsession,
                () => query.simsession,
            ]
        );

        // Initial: API returns latest subsession (correct for home page)
        expect(buggyModel.value.subsession_id).toBe(LATEST_SUBSESSION);

        // User clicks past event → URL changes
        query.m = 'results';
        query.subsession = CLICKED_SUBSESSION.toString();
        query.simsession = '0';
        await flushWatchers();

        // Watch fired, but API still returned the latest subsession!
        // The model is STALE — this is the bug the user reported.
        expect(buggyFetchFn).toHaveBeenCalledTimes(2);
        expect(buggyModel.value.subsession_id).toBe(LATEST_SUBSESSION);
        expect(buggyModel.value.subsession_id).not.toBe(CLICKED_SUBSESSION);
    });

    it('fixed: fetch overrides subsession_id from URL query params', async () => {
        setupMockUseAsyncData();
        const query = reactive({
            m: '' as string,
            league: '4534',
            season: '128679',
            subsession: '' as string,
            simsession: '' as string,
        });

        const LATEST_SUBSESSION = 84059465;
        const CLICKED_SUBSESSION = 83319765;

        // FIXED version: after fetching default context, override
        // subsession_id and simsession_id from the URL query params
        // (mirrors what HomeView's track() function should do)
        const fixedFetchFn = vi.fn(async () => {
            // Simulate defLgSeasSubCtx returning the default context
            const def = {
                league_id: 4534,
                season_id: 128679,
                subsession_id: LATEST_SUBSESSION,
                simsession_id: 0,
            };
            // Override from URL params (the fix)
            if (query.subsession) {
                def.subsession_id = Number(query.subsession);
            }
            if (query.simsession) {
                def.simsession_id = Number(query.simsession);
            }
            return def;
        });

        const fixedModel = await asyncDataWithReactiveModel(
            'test-stale-fixed',
            fixedFetchFn,
            () => ({
                league_id: 0,
                season_id: 0,
                subsession_id: 0,
                simsession_id: 0,
            }),
            [
                () => query.m,
                () => query.league,
                () => query.season,
                () => query.subsession,
                () => query.simsession,
            ]
        );

        // Initial: no subsession in URL, so API default is used
        expect(fixedModel.value.subsession_id).toBe(LATEST_SUBSESSION);

        // User clicks past event → URL changes
        query.m = 'results';
        query.subsession = CLICKED_SUBSESSION.toString();
        query.simsession = '0';
        await flushWatchers();

        // Now the model reflects the clicked subsession, not the API default
        expect(fixedFetchFn).toHaveBeenCalledTimes(2);
        expect(fixedModel.value.subsession_id).toBe(CLICKED_SUBSESSION);
    });

    it('detects stale data when observables change during initial fetch (past-events nav bug)', async () => {
        setupMockUseAsyncData();

        // Simulate the parent-driven props pattern used by ResultsView.
        // On the home page, lgSeasSubCtx holds the LATEST subsession.
        // When the user clicks a past event card, the URL changes and
        // the parent watcher updates lgSeasSubCtx — but ResultsView
        // has already started mounting with the stale value.
        const LATEST_SUBSESSION = '84059465';
        const CLICKED_SUBSESSION = '83319765';

        const props = reactive({
            subsession: LATEST_SUBSESSION, // stale value from parent
        });

        // The fetch function reads props at call time (models
        // ResultsView's fetchModelData which reads props.subsession
        // synchronously and passes it to getResultsModel).
        const fetchFn = vi.fn(async () => {
            return { subsession_id: props.subsession };
        });

        // Start model initialization (async — suspends at useAsyncData).
        // This mirrors ResultsView mounting with stale lgSeasSubCtx props.
        const modelPromise = asyncDataWithReactiveModel(
            'test-mid-init-stale',
            fetchFn,
            () => ({ subsession_id: '' }),
            [() => props.subsession]
        );

        // Parent's lgSeasSubCtx watcher completes and updates
        // the prop WHILE the child's initial fetch is in flight.
        // In the real app this happens because the template v-if
        // switches to ResultsView synchronously (before the async
        // lgSeasSubCtx watcher resolves), so ResultsView mounts
        // with old props, then props update mid-initialization.
        props.subsession = CLICKED_SUBSESSION;

        const model = await modelPromise;
        await flushWatchers();

        // The model should reflect the CURRENT observable value,
        // not the stale value that was used for the initial fetch.
        // BUG: The watcher inside asyncDataWithReactiveModel is
        // created AFTER the await, so it never sees the change
        // from LATEST → CLICKED. The data remains stale.
        expect(model.value.subsession_id).toBe(CLICKED_SUBSESSION);
    });

    it('two-layer chain: parent model update during child init causes stale child data', async () => {
        setupMockUseAsyncData();

        // Layer 1: lgSeasSubCtx (parent) — simulates HomeView's track()
        // Layer 2: resultsModel (child) — simulates ResultsView's fetchModelData()
        //
        // This models the exact data flow:
        //   route.query changes →
        //     lgSeasSubCtx watcher fires (async) →
        //       lgSeasSubCtx updates →
        //         ResultsView props change →
        //           resultsModel watcher fires
        //
        // The bug: ResultsView mounts with stale lgSeasSubCtx BEFORE
        // the parent watcher completes, so its initial fetch uses the
        // wrong subsession. The child watcher misses the prop update
        // because it was created after the change.

        const LATEST_SUBSESSION = 84059465;
        const CLICKED_SUBSESSION = 83319765;

        // Simulate route.query (shared by both layers)
        const routeQuery = reactive({
            m: '' as string,
            league: '4534',
            season: '128679',
            subsession: '' as string,
            simsession: '' as string,
        });

        // Layer 1: parent model (lgSeasSubCtx in HomeView)
        // Mimics track(): calls API, then overrides from route query
        const parentFetchFn = vi.fn(async () => {
            const def = {
                league_id: 4534,
                season_id: 128679,
                // API (now fixed) returns correct subsession when
                // provided, or latest when empty
                subsession_id: routeQuery.subsession
                    ? Number(routeQuery.subsession)
                    : LATEST_SUBSESSION,
                simsession_id: 0,
            };
            // Override from route (mirrors track() lines 37-40)
            if (routeQuery.subsession) {
                def.subsession_id = Number(routeQuery.subsession);
            }
            return def;
        });

        const parentModel = await asyncDataWithReactiveModel(
            'test-parent-lgSeasSubCtx',
            parentFetchFn,
            () => ({
                league_id: 4534,
                season_id: 128679,
                subsession_id: LATEST_SUBSESSION,
                simsession_id: 0,
            }),
            [
                () => routeQuery.m,
                () => routeQuery.league,
                () => routeQuery.season,
                () => routeQuery.subsession,
                () => routeQuery.simsession,
            ]
        );

        // Verify initial state: home page shows latest subsession
        expect(parentModel.value.subsession_id).toBe(LATEST_SUBSESSION);

        // --- User clicks a past event card ---
        // URL changes: ?m=results&subsession=83319765&simsession=0
        routeQuery.m = 'results';
        routeQuery.subsession = CLICKED_SUBSESSION.toString();
        routeQuery.simsession = '0';

        // In the real app, Vue's template reactivity immediately
        // switches v-if to show ResultsView. ResultsView mounts
        // with the CURRENT parentModel value (still LATEST because
        // the parent watcher hasn't completed yet).
        //
        // Simulate: ResultsView reads props from stale parentModel
        const childProps = reactive({
            subsession: parentModel.value.subsession_id.toString(),
        });

        // Layer 2: child model (resultsModel in ResultsView)
        const childFetchFn = vi.fn(async () => {
            return {
                subsession_id: childProps.subsession,
                data: `results-for-${childProps.subsession}`,
            };
        });

        // Child starts initializing with stale props.
        // asyncDataWithReactiveModel is async — it suspends at
        // `await useAsyncData(...)`.
        const childPromise = asyncDataWithReactiveModel(
            'test-child-resultsModel',
            childFetchFn,
            () => ({ subsession_id: '', data: '' }),
            [() => childProps.subsession]
        );

        // While the child is suspended (initial fetch in flight),
        // the parent watcher completes and updates props.
        // This is the critical timing: the prop changes DURING
        // the child's initialization, BEFORE the watch is created.
        childProps.subsession = CLICKED_SUBSESSION.toString();

        // Parent model should also update (its watcher was
        // triggered by routeQuery changes above)
        await flushWatchers();
        expect(parentModel.value.subsession_id).toBe(CLICKED_SUBSESSION);

        const childModel = await childPromise;
        await flushWatchers();

        // The child model should show data for the CLICKED
        // subsession, not the LATEST one.
        // BUG: childModel was fetched with stale props during init,
        // and the watcher missed the prop update.
        expect(childModel.value.subsession_id).toBe(
            CLICKED_SUBSESSION.toString()
        );
        expect(childModel.value.data).toBe(`results-for-${CLICKED_SUBSESSION}`);
    });

    it('multiple independent instances all fire their watches', async () => {
        setupMockUseAsyncData();
        const props = reactive({
            league: '637',
            season: '108750',
        });

        // Simulate PastEventCards (2 observables)
        const fetchA = vi.fn(async () => ({ id: 'A' }));
        await asyncDataWithReactiveModel(
            'pastEvents',
            fetchA,
            () => ({ id: '' }),
            [() => props.league, () => props.season]
        );

        // Simulate LeagueSeasonMenu (3 observables)
        const fetchB = vi.fn(async () => ({ id: 'B' }));
        await asyncDataWithReactiveModel(
            'leagueMenu',
            fetchB,
            () => ({ id: '' }),
            [() => props.league, () => props.season, () => '']
        );

        // Simulate DriverStandings (3 observables)
        const fetchC = vi.fn(async () => ({ id: 'C' }));
        await asyncDataWithReactiveModel(
            'standings',
            fetchC,
            () => ({ id: '' }),
            [() => props.league, () => props.season, () => true]
        );

        expect(fetchA).toHaveBeenCalledTimes(1);
        expect(fetchB).toHaveBeenCalledTimes(1);
        expect(fetchC).toHaveBeenCalledTimes(1);

        // Change shared observables
        props.league = '4534';
        props.season = '105035';
        await flushWatchers();

        expect(fetchA).toHaveBeenCalledTimes(2);
        expect(fetchB).toHaveBeenCalledTimes(2);
        expect(fetchC).toHaveBeenCalledTimes(2);
    });
});
