import { ref, watch, onMounted } from 'vue';
import type { Ref } from 'vue';

/**
 * Tracks the load state of an `<img>` bound to a possibly-404ing
 * `src` (e.g. a trkcam winner capture, sparse until the producer
 * backfills), resetting whenever the src itself changes.
 *
 * `ready` starts `false` on both server and client — SSR can't know
 * in advance whether the image will 404, and defaulting to "assume
 * it works" renders success-only styling (borders, gradients, has-
 * photo layout) that then has to be torn back out the moment the
 * client's real request 404s, which reads as the photo flickering in
 * and disappearing right after hydration. Defaulting to `false` and
 * flipping on `@load` means the no-capture case (still the common
 * one) never shows anything but the plain fallback, and the
 * has-capture case reveals in place instead of flickering.
 *
 * Bind the returned `imgEl` as the `<img>`'s template ref. A small or
 * cached image can finish loading (or fail) before Vue hydrates and
 * attaches the `@load`/`@error` listeners, and a DOM event fired with
 * no listener attached is simply lost — so on mount this checks
 * whether the browser already resolved it and catches up manually.
 */
export function useImageFallback(src: Ref<string | null | undefined>) {
    const failed = ref(false);
    const ready = ref(false);
    const imgEl = ref<HTMLImageElement | null>(null);

    watch(src, () => {
        failed.value = false;
        ready.value = false;
    });

    function onError() {
        failed.value = true;
        ready.value = false;
    }

    function onLoad() {
        ready.value = true;
    }

    onMounted(() => {
        const el = imgEl.value;
        if (!el || !el.getAttribute('src')) return;
        if (el.complete) {
            if (el.naturalWidth > 0) onLoad();
            else onError();
        }
    });

    return { failed, ready, onError, onLoad, imgEl };
}
