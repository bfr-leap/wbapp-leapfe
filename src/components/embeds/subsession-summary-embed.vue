<script setup lang="ts">
import { ref, watch, watchEffect } from 'vue';
import type { Ref } from 'vue';
import { useRoute } from 'vue-router';
import type { SubsessionSummaryEmbedModel } from '@/models/embeds/subsession-summary-embed-model';
import {
    getSubsessionSummaryEmbedModel,
    getDefaultSubsessionSummaryEmbedModel,
} from '@/models/embeds/subsession-summary-embed-model';

const route = useRoute();

let subsessionSummaryEmbedModel: Ref<SubsessionSummaryEmbedModel> = ref(
    getDefaultSubsessionSummaryEmbedModel()
);

let isLight: Ref<boolean> = ref(false);

async function fetchModel() {
    subsessionSummaryEmbedModel.value = await getSubsessionSummaryEmbedModel(
        Number.parseInt(route.query.subsession as string, 10) || 0,
        0
    );

    if ((route.query.isLight as string) === 'true') {
        isLight.value = true;
    } else {
        isLight.value = false;
    }
}
watchEffect(fetchModel);
watch(route, fetchModel);
</script>

<template>
    <div v-if="isLight === false" class="card bg-dark text-light m-2">
        <div class="card-body p-2">
            <div class="card-body p-2">
                <p v-for="p of subsessionSummaryEmbedModel.summaryText">
                    {{ p }}
                </p>
            </div>
        </div>
    </div>

    <div v-else class="card bg-light text-dark m-2">
        <div class="card-body p-2">
            <div class="card-body p-2">
                <p v-for="p of subsessionSummaryEmbedModel.summaryText">
                    {{ p }}
                </p>
            </div>
        </div>
    </div>
</template>
