<script setup lang="ts">
import {
    ref,
    computed,
    reactive,
    watch,
    onMounted,
    onBeforeUnmount,
    nextTick,
} from 'vue';

export interface CarouselPhoto {
    src: string;
    alt?: string;
    /** Short visible label overlaid on the slide, e.g. a highlight category. */
    caption?: string;
}

const props = defineProps<{
    /** Unique DOM id — Bootstrap's carousel targets slides/controls by it. */
    id: string;
    photos: CarouselPhoto[];
}>();

// Photos are pre-confirmed to exist (built from a broker index) except
// possibly the caller's own "guessed URL" entries (e.g. a winner
// capture) — track failures per-src so those quietly drop out instead
// of showing a broken-image icon, same as PhotoGallery.
const failed = reactive(new Set<string>());
function onImgError(src: string) {
    failed.add(src);
}
const visiblePhotos = computed(() =>
    props.photos.filter((p) => !failed.has(p.src))
);

// Bootstrap ships no TypeScript types for the standalone bundle; only
// `dispose()` is used here, so a minimal local shape avoids `any`.
interface BootstrapCarouselInstance {
    dispose(): void;
}

const rootEl = ref<HTMLElement | null>(null);
let carouselInstance: BootstrapCarouselInstance | null = null;

async function initCarousel() {
    if (!rootEl.value || visiblePhotos.value.length < 2) return;
    const { Carousel } = await import(
        'bootstrap/dist/js/bootstrap.bundle.min.js'
    );
    carouselInstance = new Carousel(rootEl.value, {
        ride: false,
        wrap: true,
    });
}

function destroyCarousel() {
    carouselInstance?.dispose();
    carouselInstance = null;
}

onMounted(initCarousel);
onBeforeUnmount(destroyCarousel);

// Bootstrap's Carousel instance caches slide count/DOM refs at
// construction time, so any change to the visible slide set (a new
// subsession/driver, or a slide dropping out on 404) needs a fresh
// instance rather than relying on Bootstrap to notice the DOM changed.
watch(
    () => visiblePhotos.value.map((p) => p.src).join('|'),
    async () => {
        destroyCarousel();
        await nextTick();
        await initCarousel();
    }
);
</script>

<template>
    <div
        v-if="visiblePhotos.length"
        v-bind:id="id"
        ref="rootEl"
        class="carousel slide photo-carousel"
    >
        <div v-if="visiblePhotos.length > 1" class="carousel-indicators">
            <button
                v-for="(p, i) in visiblePhotos"
                v-bind:key="p.src"
                type="button"
                v-bind:data-bs-target="`#${id}`"
                v-bind:data-bs-slide-to="i"
                v-bind:class="{ active: i === 0 }"
                v-bind:aria-current="i === 0 ? 'true' : undefined"
                v-bind:aria-label="`Slide ${i + 1}`"
            ></button>
        </div>
        <div class="carousel-inner">
            <div
                v-for="(p, i) in visiblePhotos"
                v-bind:key="p.src"
                class="carousel-item"
                v-bind:class="{ active: i === 0 }"
            >
                <img
                    v-bind:src="p.src"
                    class="d-block w-100 carousel-photo"
                    v-bind:alt="p.alt || ''"
                    v-on:error="onImgError(p.src)"
                />
                <div
                    v-if="p.caption"
                    class="carousel-caption d-none d-md-block"
                >
                    <p>{{ p.caption }}</p>
                </div>
            </div>
        </div>
        <template v-if="visiblePhotos.length > 1">
            <button
                class="carousel-control-prev"
                type="button"
                v-bind:data-bs-target="`#${id}`"
                data-bs-slide="prev"
            >
                <span
                    class="carousel-control-prev-icon"
                    aria-hidden="true"
                ></span>
                <span class="visually-hidden">Previous</span>
            </button>
            <button
                class="carousel-control-next"
                type="button"
                v-bind:data-bs-target="`#${id}`"
                data-bs-slide="next"
            >
                <span
                    class="carousel-control-next-icon"
                    aria-hidden="true"
                ></span>
                <span class="visually-hidden">Next</span>
            </button>
        </template>
    </div>
</template>

<style scoped>
.photo-carousel {
    border-radius: var(--radius-md, 8px);
    overflow: hidden;
    border: 1px solid var(--border-subtle);
    background: var(--surface-2);
}

.carousel-photo {
    aspect-ratio: 16 / 9;
    object-fit: cover;
}

.carousel-caption p {
    margin: 0;
    font-size: var(--text-sm);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}
</style>
