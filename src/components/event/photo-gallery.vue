<script setup lang="ts">
import { reactive, onMounted } from 'vue';

export interface GalleryPhoto {
    src: string;
    alt?: string;
}

defineProps<{
    photos: GalleryPhoto[];
}>();

// Keyed by src (not index), so failures don't carry over when the
// photo list changes — a capture that 404s (sparse coverage today)
// just drops out of the gallery rather than leaving a broken image.
const failed = reactive(new Set<string>());

function onError(src: string) {
    failed.add(src);
}

// A cached/fast-failing image can 404 before Vue finishes hydrating
// and attaches @error, and a DOM event fired with no listener
// attached is simply lost. Check each image's already-resolved state
// once mounted so that race doesn't leave a broken-image icon stuck
// in the gallery.
const imgEls = new Map<string, HTMLImageElement>();

function setImgEl(src: string, el: Element | null) {
    if (el instanceof HTMLImageElement) imgEls.set(src, el);
    else imgEls.delete(src);
}

onMounted(() => {
    for (const [src, el] of imgEls) {
        if (el.complete && el.naturalWidth === 0) onError(src);
    }
});
</script>

<template>
    <template v-for="photo in photos" :key="photo.src">
        <img
            v-if="!failed.has(photo.src)"
            v-bind:ref="(el) => setImgEl(photo.src, el as Element | null)"
            class="gallery-photo"
            v-bind:src="photo.src"
            v-bind:alt="photo.alt || ''"
            loading="lazy"
            @error="onError(photo.src)"
        />
    </template>
</template>

<style scoped>
.gallery-photo {
    float: left;
    width: 45%;
    max-width: 320px;
    aspect-ratio: 16 / 9;
    object-fit: cover;
    margin: 0 var(--space-4) var(--space-3) 0;
    border-radius: var(--radius-md, 8px);
    border: 1px solid var(--border-subtle);
}

@media (max-width: 575.98px) {
    .gallery-photo {
        float: none;
        width: 100%;
        max-width: none;
        margin: 0 0 var(--space-3) 0;
    }
}
</style>
