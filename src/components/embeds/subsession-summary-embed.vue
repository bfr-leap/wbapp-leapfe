<script setup lang="ts">
import { ref } from 'vue';
import type { Ref } from 'vue';
import { useRoute } from 'vue-router';
import type { SubsessionSummaryEmbedModel } from '@@/src/models/embeds/subsession-summary-embed-model';
import {
    getSubsessionSummaryEmbedModel,
    getDefaultSubsessionSummaryEmbedModel,
} from '@@/src/models/embeds/subsession-summary-embed-model';

const route = useRoute();

async function fetchModel() {
    return await getSubsessionSummaryEmbedModel(
        (route.query.league as string) || '',
        (route.query.season as string) || '',
        (route.query.subsession as string) || '',
        (route.query.isLight as string) === 'true',
        (route.query.font as string) || ''
    );
}

const subsessionSummaryEmbedModel: Ref<SubsessionSummaryEmbedModel> =
    await asyncDataWithReactiveModel<SubsessionSummaryEmbedModel>(
        `SubsessionSummaryEmbedModel-${[
            route.query.league as string,
            route.query.season as string,
            route.query.subsession as string,
        ]
            .map((v) => (v || '').toString())
            .join('-')}`,
        fetchModel,
        getDefaultSubsessionSummaryEmbedModel,
        [
            () => route.query.league,
            () => route.query.season,
            () => route.query.subsession,
        ]
    );

function navigate(subsession: string) {
    const url = new URL(window.location.href);
    url.searchParams.set('subsession', subsession);
    window.location.href = url.toString();
}
</script>

<template>
    <div
        class="embed-frame"
        :class="{ 'embed-frame--light': subsessionSummaryEmbedModel.isLight }"
        :style="
            subsessionSummaryEmbedModel.font
                ? { fontFamily: subsessionSummaryEmbedModel.font }
                : {}
        "
    >
        <h6 v-if="subsessionSummaryEmbedModel.title" class="embed-title">
            {{ subsessionSummaryEmbedModel.title }}
        </h6>

        <div class="embed-body">
            <p v-for="p of subsessionSummaryEmbedModel.summaryText">
                {{ p }}
            </p>
        </div>

        <div class="embed-nav">
            <button
                type="button"
                class="embed-btn"
                :disabled="!subsessionSummaryEmbedModel.hasPrev"
                @click="navigate(subsessionSummaryEmbedModel.prevSubsession)"
            >
                &laquo; Previous Event
            </button>
            <button
                type="button"
                class="embed-btn"
                :disabled="!subsessionSummaryEmbedModel.hasNext"
                @click="navigate(subsessionSummaryEmbedModel.nextSubsession)"
            >
                Next Event &raquo;
            </button>
        </div>
    </div>
</template>

<style scoped>
.embed-frame {
    padding: var(--space-3);
    color: var(--text-primary);
    background: var(--surface-0);
}
.embed-frame--light {
    color: #1a1a1a;
    background: #ffffff;
}

.embed-title {
    margin: 0 0 var(--space-3);
    font-weight: 700;
    font-size: var(--text-lg);
}

.embed-body {
    line-height: 1.5;
}
.embed-body p {
    margin: 0 0 var(--space-3);
}
.embed-body p:last-child {
    margin-bottom: 0;
}

.embed-nav {
    display: flex;
    justify-content: space-between;
    margin-top: var(--space-4);
    gap: var(--space-2);
}

.embed-btn {
    background: transparent;
    border: 1px solid currentColor;
    border-radius: var(--radius-sm);
    padding: var(--space-1) var(--space-3);
    color: inherit;
    font-family: inherit;
    font-size: var(--text-sm);
    cursor: pointer;
    opacity: 0.85;
    transition: opacity var(--duration-fast) var(--easing-out);
}
.embed-btn:hover:not(:disabled) {
    opacity: 1;
}
.embed-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
}
</style>
