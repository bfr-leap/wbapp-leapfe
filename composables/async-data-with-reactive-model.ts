import type { Ref } from 'vue';
import { ref, watchEffect, watch } from 'vue';

export interface ReactiveModelResult<T> {
    model: Ref<T>;
    error: Ref<string | null>;
    pending: Ref<boolean>;
}

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
            return await fetchModelFunction();
        } catch (e) {
            const msg =
                e instanceof Error ? e.message : 'Unknown error';
            console.error(`[${dataKey}] Model fetch failed:`, msg);
            errorRef.value = msg;
            return defaultModelFunction();
        }
    };

    // Using useAsyncData to fetch the model during SSR and client-side
    const {
        data: model,
        pending,
        error,
    } = await useAsyncData(dataKey, safeFetch);

    if (error.value) {
        errorRef.value = error.value.message;
    }

    let refReady = false;
    watchEffect(async () => {
        if (!refReady) {
            return;
        }

        if (model.value) {
            modelRef.value = model.value as T;
        }
    });

    // Watch for prop changes and refetch data accordingly
    watch(observables, async () => {
        if (modelRef?.value && refReady) {
            pendingRef.value = true;
            errorRef.value = null;
            model.value = (await safeFetch()) as T;
            modelRef.value = model.value as T;
            pendingRef.value = false;
        }
    });

    const modelRef: Ref<T> = ref<T>(
        model.value as T
    ) as Ref<T>;
    refReady = true;

    return {
        model: modelRef,
        error: errorRef,
        pending: pendingRef,
    };
}
