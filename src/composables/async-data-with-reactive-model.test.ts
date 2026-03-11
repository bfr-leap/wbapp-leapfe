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
