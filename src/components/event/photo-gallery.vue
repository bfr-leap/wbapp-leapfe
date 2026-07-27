<script setup lang="ts">
import { reactive } from 'vue';

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
</script>

<template>
    <template v-for="photo in photos" :key="photo.src">
        <img
            v-if="!failed.has(photo.src)"
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
