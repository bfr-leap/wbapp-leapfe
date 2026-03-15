import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref, nextTick, reactive } from 'vue';

// Mock useAsyncData (Nuxt auto-import)
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

async function flushWatchers(ms = 100) {
    await nextTick();
    await new Promise((r) => setTimeout(r, ms));
    await nextTick();
}

// ─────────────────────────────────────────────────────────────────────
// Sequential update tests — these target the "works then stops" pattern
// by doing many rapid prop changes and verifying the model stays in sync.
// ─────────────────────────────────────────────────────────────────────
describe('asyncDataWithReactiveModel - sequential update resilience', () => {
    beforeEach(() => {
        mockUseAsyncData.mockReset();
    });

    it('model ref stays in sync through 10 rapid sequential updates', async () => {
        setupMockUseAsyncData();
        const props = reactive({ league: '0', season: '0' });

        const fetchFn = vi.fn(async () => ({
            league: props.league,
            season: props.season,
        }));

        const model = await asyncDataWithReactiveModel(
            'seq-10-updates',
            fetchFn,
            () => ({ league: '', season: '' }),
            [() => props.league, () => props.season]
        );

        expect(model.value).toEqual({ league: '0', season: '0' });

        for (let i = 1; i <= 10; i++) {
            props.league = String(i);
            props.season = String(i * 100);
            await flushWatchers();

            expect(model.value).toEqual({
                league: String(i),
                season: String(i * 100),
            });
        }

        // fetch called: 1 initial + 10 updates
        expect(fetchFn).toHaveBeenCalledTimes(11);
    });

    it('model ref updates correctly when only one observable changes', async () => {
        setupMockUseAsyncData();
        const props = reactive({
            league: 'A',
            season: '1',
            mode: 'standings',
        });

        const fetchFn = vi.fn(async () => ({
            key: `${props.league}-${props.season}-${props.mode}`,
        }));

        const model = await asyncDataWithReactiveModel(
            'single-obs-change',
            fetchFn,
            () => ({ key: '' }),
            [() => props.league, () => props.season, () => props.mode]
        );

        expect(model.value.key).toBe('A-1-standings');

        // Change only season multiple times
        for (const s of ['2', '3', '4', '5']) {
            props.season = s;
            await flushWatchers();
            expect(model.value.key).toBe(`A-${s}-standings`);
        }

        expect(fetchFn).toHaveBeenCalledTimes(5);
    });

    it('error state recovers on subsequent successful fetches', async () => {
        setupMockUseAsyncData();
        const props = reactive({ league: '1' });
        let shouldFail = false;

        const fetchFn = vi.fn(async () => {
            if (shouldFail) throw new Error('Network error');
            return { league: props.league };
        });

        const result = await asyncDataWithReactiveModelResult(
            'error-recovery',
            fetchFn,
            () => ({ league: '' }),
            [() => props.league]
        );

        expect(result.error.value).toBeNull();
        expect(result.model.value).toEqual({ league: '1' });

        // Trigger a failure
        shouldFail = true;
        props.league = '2';
        await flushWatchers();

        expect(result.error.value).toBe('Network error');

        // Recover
        shouldFail = false;
        props.league = '3';
        await flushWatchers();

        expect(result.error.value).toBeNull();
        expect(result.model.value).toEqual({ league: '3' });
    });

    it('pending state toggles correctly during each fetch cycle', async () => {
        setupMockUseAsyncData();
        const props = reactive({ league: '1' });
        const pendingSnapshots: boolean[] = [];
        let resolveDeferred: (() => void) | null = null;

        const fetchFn = vi.fn(async () => {
            return { league: props.league };
        });

        const result = await asyncDataWithReactiveModelResult(
            'pending-toggle',
            fetchFn,
            () => ({ league: '' }),
            [() => props.league]
        );

        // After init, pending should be false
        expect(result.pending.value).toBe(false);

        // Trigger update
        props.league = '2';
        await flushWatchers();

        // After update completes, pending should be false again
        expect(result.pending.value).toBe(false);
        expect(result.model.value).toEqual({ league: '2' });
    });

    it('handles interleaved updates from multiple independent instances', async () => {
        setupMockUseAsyncData();
        const props = reactive({ league: '1', season: '100' });

        // Simulate three components sharing the same props
        const fetchA = vi.fn(async () => ({
            id: 'nav',
            league: props.league,
        }));
        const fetchB = vi.fn(async () => ({
            id: 'standings',
            season: props.season,
        }));
        const fetchC = vi.fn(async () => ({
            id: 'results',
            combo: `${props.league}-${props.season}`,
        }));

        const modelA = await asyncDataWithReactiveModel(
            'interleave-nav',
            fetchA,
            () => ({ id: '', league: '' }),
            [() => props.league, () => props.season]
        );
        const modelB = await asyncDataWithReactiveModel(
            'interleave-standings',
            fetchB,
            () => ({ id: '', season: '' }),
            [() => props.league, () => props.season]
        );
        const modelC = await asyncDataWithReactiveModel(
            'interleave-results',
            fetchC,
            () => ({ id: '', combo: '' }),
            [() => props.league, () => props.season]
        );

        // 5 rapid updates
        for (let i = 2; i <= 6; i++) {
            props.league = String(i);
            props.season = String(i * 100);
            await flushWatchers();
        }

        // All three instances should reflect the final state
        expect(modelA.value).toEqual({ id: 'nav', league: '6' });
        expect(modelB.value).toEqual({ id: 'standings', season: '600' });
        expect(modelC.value).toEqual({ id: 'results', combo: '6-600' });

        // Each should have been called 6 times (1 init + 5 updates)
        expect(fetchA).toHaveBeenCalledTimes(6);
        expect(fetchB).toHaveBeenCalledTimes(6);
        expect(fetchC).toHaveBeenCalledTimes(6);
    });
});
