import { ref, watch } from 'vue';
import type { Ref } from 'vue';

/**
 * Tracks whether an `<img>` bound to a possibly-404ing `src` (e.g. a
 * trkcam winner capture, sparse until the producer backfills) has
 * failed to load, resetting whenever the src itself changes.
 */
export function useImageFallback(src: Ref<string | null | undefined>) {
    const failed = ref(false);

    watch(src, () => {
        failed.value = false;
    });

    function onError() {
        failed.value = true;
    }

    return { failed, onError };
}
