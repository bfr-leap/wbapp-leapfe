import type { Ref } from 'vue';
import { ref, watchEffect, watch } from 'vue';

export async function asyncDataWithReactiveModel<T>(
    dataKey: string,
    fetchModelFunction: () => Promise<T>,
    defaultModelFunction: () => T,
    observables: any[]
): Promise<Ref<T>> {
    // Using useAsyncData to fetch the model during SSR and client-side
    const {
        data: model,
        pending,
        error,
    } = await useAsyncData(dataKey, fetchModelFunction);
    const modelRef = ref<T>(defaultModelFunction());

    watchEffect(async () => {
        if (model.value) {
            modelRef.value = model.value;
        } else {
            model.value = await fetchModelFunction();
            modelRef.value = model.value;
        }
    });

    // Watch for prop changes and refetch data accordingly
    watch(observables, async () => {
        model.value = await fetchModelFunction();
        modelRef.value = model.value;
    });

    return <Ref<T>>modelRef;
}
