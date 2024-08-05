import type { Ref } from 'vue';
import { ref, watchEffect, watch } from 'vue';

export async function asyncDataWithReactiveModel<T>(
    dataKey: string,
    fetchModelFunction: () => Promise<T>,
    defaultModelFunction: () => T,
    observables: any[]
): Promise<Ref<T>> {
    // console.log(dataKey);

    // Using useAsyncData to fetch the model during SSR and client-side
    const {
        data: model,
        pending,
        error,
    } = await useAsyncData(dataKey, fetchModelFunction);

    let refReady = false;
    watchEffect(async () => {
        if (!refReady) {
            return;
        }

        if (model.value) {
            modelRef.value = <T>model.value;
        } else {
            // model.value = await fetchModelFunction();
            // modelRef.value = <T>model.value;
        }
    });

    // Watch for prop changes and refetch data accordingly
    watch(observables, async () => {
        if (modelRef?.value && refReady) {
            model.value = <T>await fetchModelFunction();
            modelRef.value = <T>model.value;
        }
    });

    // modelRef.value = <T>model.value;

    const modelRef: Ref<T> = <Ref<T>>ref<T>(<T>model.value);
    refReady = true;

    return modelRef;
}
