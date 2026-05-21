<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    /** Finishing positions oldest → newest. `null` means DNS. */
    finishes: (number | null)[];
}>();

type Bucket = 'podium' | 'top10' | 'midfield' | 'dns';

function bucketFor(pos: number | null): Bucket {
    if (pos === null) return 'dns';
    if (pos <= 3) return 'podium';
    if (pos <= 10) return 'top10';
    return 'midfield';
}

function labelFor(pos: number | null): string {
    if (pos === null) return 'Did not start';
    return `P${pos}`;
}

const dots = computed(() =>
    props.finishes.map((pos) => ({
        pos,
        bucket: bucketFor(pos),
        label: labelFor(pos),
    }))
);
</script>

<template>
    <div class="form-strip" role="list" aria-label="Recent race finishes">
        <span
            v-for="(d, i) in dots"
            :key="i"
            role="listitem"
            v-bind:class="['dot', `dot--${d.bucket}`]"
            v-bind:title="d.label"
        >
            <span class="dot__label">{{ d.pos ?? '—' }}</span>
        </span>
    </div>
</template>

<style scoped>
.form-strip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

.dot {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    font-family: var(--font-mono);
    font-size: 0.65rem;
    font-weight: 700;
    line-height: 1;
    font-variant-numeric: tabular-nums;
    border: 1px solid transparent;
}

.dot--podium {
    background: rgba(63, 185, 80, 0.18);
    color: var(--success, #3fb950);
    border-color: rgba(63, 185, 80, 0.45);
}
.dot--top10 {
    background: rgba(210, 153, 34, 0.16);
    color: #d29922;
    border-color: rgba(210, 153, 34, 0.4);
}
.dot--midfield {
    background: rgba(139, 148, 158, 0.14);
    color: var(--text-muted, #8b949e);
    border-color: rgba(139, 148, 158, 0.3);
}
.dot--dns {
    background: transparent;
    color: var(--text-muted, #8b949e);
    border: 1px dashed rgba(139, 148, 158, 0.4);
    opacity: 0.6;
}

.dot__label {
    pointer-events: none;
}
</style>
