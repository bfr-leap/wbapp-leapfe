<script setup lang="ts">
import type { Ref } from 'vue';
import { ref, onMounted, onBeforeUnmount } from 'vue';
import RouterLinkProxy from './router-link-proxy.vue';
import type { LeagueSeasonMenuModel } from '@@/src/models/nav/league-season-menu-model';
import {
    getDefaultLeagueSeasonMenuModel,
    getLeagueSeasonMenuModel,
} from '@@/src/models/nav/league-season-menu-model';

const props = defineProps<{
    league: string;
    season: string;
    targetPage: string;
}>();

const { isSignedIn } = useAuthState();
const open = ref(false);
const root = ref<HTMLElement | null>(null);

async function fetchModel() {
    return await getLeagueSeasonMenuModel(
        props.league,
        props.season,
        props.targetPage,
        isSignedIn
    );
}

const model: Ref<LeagueSeasonMenuModel> =
    await asyncDataWithReactiveModel<LeagueSeasonMenuModel>(
        `LeagueSeasonChipModel-${[
            props.league,
            props.season,
            props.targetPage,
        ].join('-')}`,
        fetchModel,
        getDefaultLeagueSeasonMenuModel,
        [() => props.league, () => props.season, () => props.targetPage]
    );

function toggle() {
    open.value = !open.value;
}
function close() {
    open.value = false;
}
function onDocClick(e: MouseEvent) {
    if (!open.value) return;
    const target = e.target as Node;
    if (root.value && !root.value.contains(target)) close();
}
function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
}

onMounted(() => {
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);
});
onBeforeUnmount(() => {
    document.removeEventListener('click', onDocClick);
    document.removeEventListener('keydown', onKey);
});
</script>

<template>
    <div
        ref="root"
        class="scope-chip"
        v-bind:class="{ 'scope-chip--open': open }"
    >
        <button
            class="scope-chip__btn"
            type="button"
            v-bind:aria-expanded="open"
            @click="toggle"
        >
            <span class="scope-chip__primary">{{
                model.leagueOptions.selected
            }}</span>
            <span class="scope-chip__sep">·</span>
            <span class="scope-chip__secondary num">{{
                model.seasonOptions.selected
            }}</span>
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

        <div v-if="open" class="scope-chip__sheet" role="menu">
            <div class="scope-chip__group">
                <div class="scope-chip__group-title">League</div>
                <RouterLinkProxy
                    v-for="opt in model.leagueOptions.options"
                    :key="`l-${opt.href}`"
                    class="scope-chip__opt"
                    v-bind:class="{
                        'scope-chip__opt--active':
                            opt.display === model.leagueOptions.selected,
                    }"
                    v-bind:to="opt.href"
                    @click="close"
                >
                    {{ opt.display }}
                </RouterLinkProxy>
            </div>
            <div class="scope-chip__group">
                <div class="scope-chip__group-title">Season</div>
                <RouterLinkProxy
                    v-for="opt in model.seasonOptions.options"
                    :key="`s-${opt.href}`"
                    class="scope-chip__opt"
                    v-bind:class="{
                        'scope-chip__opt--active':
                            opt.display === model.seasonOptions.selected,
                    }"
                    v-bind:to="opt.href"
                    @click="close"
                >
                    {{ opt.display }}
                </RouterLinkProxy>
            </div>
        </div>
    </div>
</template>

<style scoped>
.scope-chip {
    position: relative;
    display: inline-block;
}

.scope-chip__btn {
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
    transition: background-color var(--duration-fast) var(--easing-out),
        border-color var(--duration-fast) var(--easing-out);
}
.scope-chip__btn:hover {
    background: var(--surface-3);
    border-color: var(--border-strong);
}
.scope-chip--open .scope-chip__btn {
    background: var(--surface-3);
    border-color: var(--border-strong);
}

.scope-chip__primary {
    font-weight: 500;
}
.scope-chip__sep {
    color: var(--text-muted);
}
.scope-chip__secondary {
    color: var(--text-secondary);
    font-family: var(--font-mono);
    letter-spacing: 0;
}
.scope-chip__caret {
    margin-left: var(--space-1);
    color: var(--text-muted);
    transition: transform var(--duration-fast) var(--easing-out);
    flex-shrink: 0;
}
.scope-chip--open .scope-chip__caret {
    transform: rotate(180deg);
}

.scope-chip__sheet {
    position: absolute;
    top: calc(100% + var(--space-2));
    left: 0;
    z-index: calc(var(--z-header) + 1);
    min-width: 18rem;
    max-height: 70vh;
    overflow: auto;
    background: var(--surface-1);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-md);
    padding: var(--space-2);
    box-shadow: var(--shadow-2);
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
}

@media (max-width: 575px) {
    .scope-chip__sheet {
        position: fixed;
        top: auto;
        bottom: calc(var(--bottom-nav-h) + env(safe-area-inset-bottom) + var(--space-2));
        left: var(--gutter-page);
        right: var(--gutter-page);
        max-height: 60vh;
        grid-template-columns: 1fr;
    }
}

.scope-chip__group-title {
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: var(--tracking-wide);
    color: var(--text-muted);
    font-weight: 600;
    padding: var(--space-2) var(--space-2) var(--space-1);
}

.scope-chip :deep(.scope-chip__opt) {
    display: block;
    padding: var(--space-2);
    color: var(--text-secondary);
    text-decoration: none !important;
    border-radius: var(--radius-sm);
    font-size: var(--text-sm);
    cursor: pointer;
}
.scope-chip :deep(.scope-chip__opt:hover) {
    background: var(--surface-3);
    color: var(--text-primary);
}
.scope-chip :deep(.scope-chip__opt--active) {
    color: var(--text-primary);
    background: var(--surface-2);
    box-shadow: inset 2px 0 0 var(--accent);
    padding-left: calc(var(--space-2) + 2px);
}
</style>
