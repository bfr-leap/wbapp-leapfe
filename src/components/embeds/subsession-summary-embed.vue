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
        (route.query.isLight as string) === 'true'
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
        class="card m-2"
        :class="
            subsessionSummaryEmbedModel.isLight
                ? 'bg-light text-dark'
                : 'bg-dark text-light'
        "
    >
        <div class="card-body p-2">
            <h6
                v-if="subsessionSummaryEmbedModel.title"
                class="card-title mb-2 fw-bold"
            >
                {{ subsessionSummaryEmbedModel.title }}
            </h6>

            <div class="card-body p-2">
                <p v-for="p of subsessionSummaryEmbedModel.summaryText">
                    {{ p }}
                </p>
            </div>

            <div class="d-flex justify-content-between mt-2 px-2">
                <button
                    class="btn btn-sm"
                    :class="
                        subsessionSummaryEmbedModel.isLight
                            ? 'btn-outline-dark'
                            : 'btn-outline-light'
                    "
                    :disabled="!subsessionSummaryEmbedModel.hasPrev"
                    @click="
                        navigate(subsessionSummaryEmbedModel.prevSubsession)
                    "
                >
                    &laquo; Previous Event
                </button>
                <button
                    class="btn btn-sm"
                    :class="
                        subsessionSummaryEmbedModel.isLight
                            ? 'btn-outline-dark'
                            : 'btn-outline-light'
                    "
                    :disabled="!subsessionSummaryEmbedModel.hasNext"
                    @click="
                        navigate(subsessionSummaryEmbedModel.nextSubsession)
                    "
                >
                    Next Event &raquo;
                </button>
            </div>
        </div>
    </div>
</template>
