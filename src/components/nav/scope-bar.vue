<script setup lang="ts">
import {
    ref,
    computed,
    nextTick,
    onMounted,
    onBeforeUnmount,
    watch,
} from 'vue';
import { useRoute } from 'vue-router';
import RouterLinkProxy from './router-link-proxy.vue';
import ScopeChip from './scope-chip.vue';
import type { ScopeDimension } from './scope-types';

defineProps<{
    dimensions: ScopeDimension[];
}>();

const root = ref<HTMLElement | null>(null);
const sheetRef = ref<HTMLElement | null>(null);
const openKey = ref<string | null>(null);
const anchorEl = ref<HTMLElement | null>(null);
const sheetPos = ref({ top: 0, left: 0 });
const isMobile = ref(false);

const open = computed(() => openKey.value !== null);

function updateBreakpoint() {
    if (typeof window === 'undefined') return;
    isMobile.value = window.matchMedia('(max-width: 575px)').matches;
}

function updatePos() {
    if (!anchorEl.value || !open.value) return;
    const r = anchorEl.value.getBoundingClientRect();
    sheetPos.value = {
        top: Math.round(r.bottom + 8),
        left: Math.round(r.left),
    };
}

const sheetStyle = computed(() => {
    if (isMobile.value) return {};
    return {
        top: `${sheetPos.value.top}px`,
        left: `${sheetPos.value.left}px`,
    };
});

function isOpenFor(dim: ScopeDimension): boolean {
    return openKey.value === dim.key;
}

function onChipOpen(dim: ScopeDimension, el: HTMLElement) {
    if (openKey.value === dim.key) {
        close();
        return;
    }
    openKey.value = dim.key;
    anchorEl.value = el;
    nextTick(updatePos);
}

function close() {
    openKey.value = null;
    anchorEl.value = null;
}

// Close the sheet whenever the route changes — the @click on
// RouterLinkProxy doesn't always fire because the component is
// a Fragment (multiple root branches), and clicking an option
// is the most common reason the route changes anyway.
const route = useRoute();
watch(
    () => route.fullPath,
    () => close()
);

function onDocClick(e: MouseEvent) {
    if (!open.value) return;
    const target = e.target as Node;
    const inRoot = root.value?.contains(target) ?? false;
    const inSheet = sheetRef.value?.contains(target) ?? false;
    if (!inRoot && !inSheet) close();
}

function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
}

onMounted(() => {
    updateBreakpoint();
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', updateBreakpoint);
    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos, true);
});
onBeforeUnmount(() => {
    document.removeEventListener('click', onDocClick);
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', updateBreakpoint);
    window.removeEventListener('resize', updatePos);
    window.removeEventListener('scroll', updatePos, true);
});
</script>

<template>
    <div ref="root" class="scope-bar">
        <ScopeChip
            v-for="dim in dimensions"
            :key="dim.key"
            v-bind:dimension="dim"
            v-bind:is-open="isOpenFor(dim)"
            @open="(el: HTMLElement) => onChipOpen(dim, el)"
        />

        <Teleport to="body">
            <div
                v-if="open"
                ref="sheetRef"
                class="scope-sheet"
                role="menu"
                v-bind:style="sheetStyle"
            >
                <div
                    v-for="dim in dimensions"
                    :key="dim.key"
                    class="scope-sheet__group"
                >
                    <div class="scope-sheet__title">{{ dim.label }}</div>
                    <RouterLinkProxy
                        v-for="opt in dim.options"
                        :key="`${dim.key}-${opt.href}`"
                        class="scope-sheet__opt"
                        v-bind:class="{
                            'scope-sheet__opt--active':
                                opt.display === dim.selected,
                        }"
                        v-bind:to="opt.href"
                        @click="close"
                    >
                        {{ opt.display }}
                    </RouterLinkProxy>
                </div>
            </div>
        </Teleport>
    </div>
</template>

<style scoped>
.scope-bar {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    /* min-width:0 lets a chip with --truncate shrink within the
       bar's flex layout. Chips without --truncate stay at their
       natural width and ignore this. */
    min-width: 0;
    max-width: 100%;
}

/* Sheet is teleported to <body> — positioned via JS on desktop
   (anchored to whichever chip was tapped) and via CSS on mobile
   (fixed bottom sheet above the bottom-nav). The sheet always
   shows every dimension, so a mobile user can switch a hidden
   secondary dimension by opening any visible chip. */
.scope-sheet {
    position: fixed;
    z-index: 1000;
    min-width: 18rem;
    max-height: 70vh;
    overflow: auto;
    background: var(--surface-1);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-md);
    padding: var(--space-2);
    box-shadow: var(--shadow-2);
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    gap: var(--space-3);
}

@media (max-width: 575px) {
    .scope-sheet {
        top: auto;
        left: var(--gutter-page);
        right: var(--gutter-page);
        bottom: calc(
            var(--bottom-nav-h) + env(safe-area-inset-bottom) + var(--space-2)
        );
        max-height: 60vh;
        grid-template-columns: 1fr;
    }
}

.scope-sheet__title {
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: var(--tracking-wide);
    color: var(--text-muted);
    font-weight: 600;
    padding: var(--space-2) var(--space-2) var(--space-1);
}

.scope-sheet :deep(.scope-sheet__opt) {
    display: block;
    padding: var(--space-2);
    color: var(--text-secondary);
    text-decoration: none !important;
    border-radius: var(--radius-sm);
    font-size: var(--text-sm);
    cursor: pointer;
}
.scope-sheet :deep(.scope-sheet__opt:hover) {
    background: var(--surface-3);
    color: var(--text-primary);
}
.scope-sheet :deep(.scope-sheet__opt--active) {
    color: var(--text-primary);
    background: var(--surface-2);
    box-shadow: inset 2px 0 0 var(--accent);
    padding-left: calc(var(--space-2) + 2px);
}
</style>
