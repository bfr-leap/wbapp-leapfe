<script setup lang="ts">
import { ref } from 'vue';
import type { ScopeDimension } from './scope-types';

defineProps<{
    dimension: ScopeDimension;
    isOpen: boolean;
}>();

const emit = defineEmits<{
    open: [el: HTMLElement];
}>();

const buttonRef = ref<HTMLElement | null>(null);

function onClick() {
    if (buttonRef.value) emit('open', buttonRef.value);
}
</script>

<template>
    <button
        ref="buttonRef"
        type="button"
        class="scope-chip"
        v-bind:class="{
            'scope-chip--open': isOpen,
            'scope-chip--secondary': dimension.priority === 'secondary',
            'scope-chip--mono': dimension.mono,
            'scope-chip--truncate': dimension.truncate,
        }"
        v-bind:aria-expanded="isOpen"
        @click="onClick"
    >
        <span class="scope-chip__value">{{ dimension.selected }}</span>
        <svg
            class="scope-chip__caret"
            viewBox="0 0 8 5"
            width="8"
            height="5"
            fill="currentColor"
            aria-hidden="true"
        >
            <path d="M0 0l4 5 4-5z" />
        </svg>
    </button>
</template>

<style scoped>
.scope-chip {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-3);
    height: 2rem;
    background: var(--surface-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    cursor: pointer;
    font-family: inherit;
    font-size: var(--text-sm);
    line-height: 1;
    white-space: nowrap;
    /* Default chips render at natural width and do not shrink.
       Pages opt into shrink + ellipsis per dimension via the
       --truncate modifier below — used on dimensions with
       known-long values (e.g. Round titles on Results). */
    flex-shrink: 0;
    transition: background-color var(--duration-fast) var(--easing-out),
        border-color var(--duration-fast) var(--easing-out);
}
.scope-chip--truncate {
    flex-shrink: 1;
    min-width: 0;
    max-width: 14rem;
}
.scope-chip:hover {
    background: var(--surface-3);
    border-color: var(--border-strong);
}
.scope-chip--open {
    background: var(--surface-3);
    border-color: var(--border-strong);
}

.scope-chip__value {
    font-weight: 500;
    font-variant-numeric: tabular-nums;
}
.scope-chip--truncate .scope-chip__value {
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
}
.scope-chip--mono .scope-chip__value {
    font-family: var(--font-mono);
    letter-spacing: 0;
    color: var(--text-secondary);
    font-weight: 400;
}

.scope-chip__caret {
    color: var(--text-muted);
    transition: transform var(--duration-fast) var(--easing-out);
    flex-shrink: 0;
}
.scope-chip--open .scope-chip__caret {
    transform: rotate(180deg);
}

/* Secondary-priority chips hide on phones; their dimension is
   still reachable through the sheet that opens from any visible
   chip. */
@media (max-width: 575px) {
    .scope-chip--secondary {
        display: none;
    }
}
</style>
