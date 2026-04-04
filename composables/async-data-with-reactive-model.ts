import type { Ref } from 'vue';
import { ref, watchEffect, watch } from 'vue';

export interface ReactiveModelResult<T> {
    model: Ref<T>;
    error: Ref<string | null>;
    pending: Ref<boolean>;
}

// --- Diagnostics (temporary) ---
interface DiagEntry {
    key: string;
    event: string;
    ts: number;
    detail?: unknown;
}
const _diagLog: DiagEntry[] = [];
const _MAX_DIAG = 200;

function diag(key: string, event: string, detail?: unknown) {
    if (import.meta.server) return;
    const entry: DiagEntry = { key, event, ts: Date.now(), detail };
    _diagLog.push(entry);
    if (_diagLog.length > _MAX_DIAG) _diagLog.shift();
    console.log(`[DIAG][${event}] ${key}`, detail ?? '');
}

/**
 * Call `window.__LEAP_DIAG()` in the browser console after reproducing
 * an issue. It prints and returns the recent reactive-model event log.
 */
if (!import.meta.server && typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).__LEAP_DIAG = () => {
        const out = _diagLog.map((e) => {
            const age = `${((Date.now() - e.ts) / 1000).toFixed(1)}s ago`;
            const d = e.detail ? ` | ${JSON.stringify(e.detail)}` : '';
            return `[${age}] ${e.event.padEnd(16)} ${e.key}${d}`;
        });
        console.log(out.join('\n'));
        return _diagLog;
    };
}
// --- end diagnostics ---

/**
 * Wraps a model fetch function for SSR-safe reactive data.
 *
 * Returns the model ref (backwards compatible) but now also logs
 * errors and falls back to the default model on failure.
 *
 * For components that want error/pending state, use
 * `asyncDataWithReactiveModelResult()` instead.
 */
export async function asyncDataWithReactiveModel<T>(
    dataKey: string,
    fetchModelFunction: () => Promise<T>,
    defaultModelFunction: () => T,
    observables: unknown[]
): Promise<Ref<T>> {
    const result = await asyncDataWithReactiveModelResult(
        dataKey,
        fetchModelFunction,
        defaultModelFunction,
        observables
    );
    return result.model;
}

/**
 * Extended version that exposes error and pending state alongside the model.
 * Components can use this to show error banners or loading indicators.
 */
export async function asyncDataWithReactiveModelResult<T>(
    dataKey: string,
    fetchModelFunction: () => Promise<T>,
    defaultModelFunction: () => T,
    observables: unknown[]
): Promise<ReactiveModelResult<T>> {
    const errorRef = ref<string | null>(null);
    const pendingRef = ref(false);

    const safeFetch = async (): Promise<T> => {
        try {
            const t0 = Date.now();
            const result = await fetchModelFunction();
            diag(dataKey, 'fetch-ok', {
                ms: Date.now() - t0,
                type: Array.isArray(result)
                    ? `array[${result.length}]`
                    : typeof result,
            });
            return result;
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Unknown error';
            const stack =
                e instanceof Error ? e.stack?.split('\n').slice(0, 4) : [];
            console.error(`[${dataKey}] Model fetch failed:`, msg);
            diag(dataKey, 'fetch-ERROR', { msg, stack });
            errorRef.value = msg;
            return defaultModelFunction();
        }
    };

    // Resolve observable values as a JSON snapshot for comparison
    function obsStr(): string {
        try {
            return JSON.stringify(
                observables.map((o) =>
                    typeof o === 'function' ? (o as () => unknown)() : '(ref)'
                )
            );
        } catch {
            return '(serialize-err)';
        }
    }

    // Snapshot observable values BEFORE the async fetch so we can
    // detect changes that occur during the await.
    const preAwaitObs = obsStr();

    // Using useAsyncData to fetch the model during SSR and client-side
    const {
        data: model,
        pending,
        error,
    } = await useAsyncData(dataKey, safeFetch);

    diag(dataKey, 'init', {
        hasData: model.value != null,
        error: error.value?.message ?? null,
        obs: obsStr(),
    });

    if (error.value) {
        errorRef.value = error.value.message;
    }

    let refReady = false;
    watchEffect(async () => {
        if (!refReady) {
            return;
        }

        if (model.value) {
            diag(dataKey, 'watchEffect', 'syncing model→modelRef');
            modelRef.value = model.value as T;
        }
    });

    // Watch for prop changes and refetch data accordingly
    watch(observables, async (_newVal, _oldVal) => {
        const ov = obsStr();
        if (modelRef?.value && refReady) {
            diag(dataKey, 'watch-START', ov);
            pendingRef.value = true;
            errorRef.value = null;
            model.value = (await safeFetch()) as T;
            modelRef.value = model.value as T;
            pendingRef.value = false;
            diag(dataKey, 'watch-DONE', ov);
        } else {
            diag(dataKey, 'watch-SKIP', {
                hasValue: !!modelRef?.value,
                refReady,
                obs: ov,
            });
        }
    });

    const modelRef: Ref<T> = ref<T>(model.value as T) as Ref<T>;
    refReady = true;

    // Detect observables that changed during the await (race condition).
    // This happens when a parent model updates props while this model's
    // initial fetch is in flight (e.g. navigating to a past event:
    // ResultsView mounts with stale lgSeasSubCtx, then props update
    // before the watcher is created). The watcher won't fire because
    // it never saw the old values, so we refetch here.
    const postAwaitObs = obsStr();
    if (preAwaitObs !== postAwaitObs) {
        diag(dataKey, 'stale-init-refetch', {
            before: preAwaitObs,
            after: postAwaitObs,
        });
        pendingRef.value = true;
        errorRef.value = null;
        model.value = (await safeFetch()) as T;
        modelRef.value = model.value as T;
        pendingRef.value = false;
    }

    return {
        model: modelRef,
        error: errorRef,
        pending: pendingRef,
    };
}
