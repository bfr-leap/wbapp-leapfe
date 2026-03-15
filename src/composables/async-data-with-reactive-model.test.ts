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
            [
                () => props.league,
                () => props.season,
                () => props.targetPage,
            ]
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
            [
                () => props.league,
                () => props.season,
                () => props.summaryMode,
            ]
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
