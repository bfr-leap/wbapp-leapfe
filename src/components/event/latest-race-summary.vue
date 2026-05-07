<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import { getPastEventCardsModel } from '@@/src/models/event/past-events-cards-model';
import { getSubsessionSummaryEmbedModel } from '@@/src/models/embeds/subsession-summary-embed-model';
import RouterLinkProxy from '@@/src/components/nav/router-link-proxy.vue';

const props = defineProps<{
    league: string;
    season: string;
}>();

const summaryText = ref<string[]>([]);
const subsession = ref('');
const simsession = ref('');
const expanded = ref(false);

async function fetchSummary() {
    summaryText.value = [];
    subsession.value = '';
    simsession.value = '';

    if (!props.league || !props.season) return;

    const pastModel = await getPastEventCardsModel(props.league, props.season);

    // Pick the most-recent past race by date. The model returns
    // events in source order; sort defensively so a re-ordered
    // upstream doesn't pick the wrong one.
    const now = Date.now();
    const past = pastModel.pastRaces
        .filter((r) => r.date && new Date(r.date).getTime() <= now)
        .sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
    const latest = past[0];
    if (!latest?.sessionId) return;

    subsession.value = latest.sessionId;
    simsession.value = latest.simsessionId;

    const summary = await getSubsessionSummaryEmbedModel(
        props.league,
        props.season,
        latest.sessionId,
        false,
        ''
    );
    summaryText.value = (summary?.summaryText || []).filter((t) => t.trim());
}

watchEffect(fetchSummary);
</script>

<template>
    <section v-if="summaryText.length" class="section">
        <header class="section__head">
            <span class="section__title">Last Race Summary</span>
            <RouterLinkProxy
                v-if="subsession"
                class="section__more"
                v-bind:to="`?m=results&league=${league}&season=${season}&subsession=${subsession}&simsession=${simsession}`"
                >See full results →
            </RouterLinkProxy>
        </header>
        <div
            class="summary-content"
            v-bind:class="{ 'summary-content--collapsed': !expanded }"
        >
            <p v-for="(p, i) in summaryText" :key="i">{{ p }}</p>
        </div>
        <button
            type="button"
            class="summary-toggle"
            @click="expanded = !expanded"
        >
            {{ expanded ? 'Show less' : 'Read more →' }}
        </button>
    </section>
</template>

<style scoped>
.summary-content {
    line-height: 1.5;
    color: var(--text-primary);
}
.summary-content p {
    margin: 0 0 var(--space-3);
}
.summary-content p:last-child {
    margin-bottom: 0;
}

.summary-content--collapsed {
    max-height: 8rem;
    overflow: hidden;
    position: relative;
}
.summary-content--collapsed::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 4rem;
    background: linear-gradient(transparent, var(--surface-0));
    pointer-events: none;
}

.summary-toggle {
    margin-top: var(--space-3);
    background: transparent;
    border: 0;
    color: var(--text-secondary);
    font-size: var(--text-sm);
    font-weight: 500;
    cursor: pointer;
    padding: 0;
    font-family: inherit;
    transition: color var(--duration-fast) var(--easing-out);
}
.summary-toggle:hover {
    color: var(--text-primary);
}
</style>
