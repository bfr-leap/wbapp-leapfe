<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue';
import type { Ref } from 'vue';
import CumulativeDeltaChart from '@@/src/components/vis/cumulative-delta-chart.vue';
import StartFinishChart from '../vis/start-finish-chart.vue';
import PaceChart from '../vis/pace-chart.vue';
import BestQualifyLapChart from '@@/src/components/vis/best-qualify-lap-chart.vue';
import GenericTable from '../vis/generic-table.vue';
import TrackBanner from '../track/track-banner.vue';
import PhotoGallery from '../event/photo-gallery.vue';
import PhotoCarousel from '../event/photo-carousel.vue';
import type { ResultsModel } from '@@/src/models/pages/results-model';
import {
    getDefaultResultsModel,
    getResultsModel,
} from '@@/src/models/pages/results-model';
import {
    highlightImageUrl,
    HIGHLIGHT_CATEGORY_LABELS,
} from '@@/src/services/highlights-service';

const props = defineProps<{
    league: string;
    season: string;
    subsession: string;
    simsession: string;
}>();

async function fetchModelData() {
    return await getResultsModel(
        props.league,
        props.season,
        props.subsession,
        props.simsession
    );
}

const resultsModel: Ref<ResultsModel> =
    await asyncDataWithReactiveModel<ResultsModel>(
        `ResultsModel-${[
            props.league,
            props.season,
            props.subsession,
            props.simsession,
        ].join('-')}`,
        fetchModelData,
        getDefaultResultsModel,
        [
            () => props.league,
            () => props.season,
            () => props.subsession,
            () => props.simsession,
        ]
    );

const summaryExpanded = ref(false);

// The winner's finish-line capture, embedded in the Race Summary text
// rather than as a page-wide banner. Just the one photo — the battles/
// crashes/overtakes/starts highlights get their own carousel section
// below instead of piling into this gallery.
const galleryPhotos = computed(() => {
    const m = resultsModel.value;
    const isRace = m.simsessionType === 'race' || m.simsessionType === 'sprint';
    if (!isRace || !m.subsessionId) return [];
    return [
        {
            src: `/api/trkcam/winner/${m.subsessionId}`,
            alt: 'Winner finish-line capture',
        },
    ];
});

const highlightPhotos = computed(() =>
    resultsModel.value.highlights.map((h) => ({
        src: highlightImageUrl(h),
        alt: HIGHLIGHT_CATEGORY_LABELS[h.category] || 'Highlight',
        caption: HIGHLIGHT_CATEGORY_LABELS[h.category] || 'Highlight',
    }))
);
</script>

<template>
    <div class="page">
        <template
            v-if="
                resultsModel.leagueId &&
                resultsModel.seasonId &&
                resultsModel.subsessionId
            "
        >
            <section class="section">
                <TrackBanner v-bind:track-id="resultsModel.trackId" />
            </section>

            <section
                v-if="
                    resultsModel.simsessionType === 'race' ||
                    resultsModel.simsessionType === 'sprint'
                "
                class="section"
            >
                <header class="section__head">
                    <span class="section__title">Cumulative Delta</span>
                </header>
                <CumulativeDeltaChart
                    v-bind:league="resultsModel.leagueId"
                    v-bind:subsession="resultsModel.subsessionId"
                    v-bind:simsession="resultsModel.simsessionId"
                />
            </section>

            <section
                v-if="
                    resultsModel.simsessionType === 'race' ||
                    resultsModel.simsessionType === 'sprint'
                "
                class="section"
            >
                <header class="section__head">
                    <span class="section__title">Start vs Finish</span>
                </header>
                <StartFinishChart
                    v-bind:league="resultsModel.leagueId"
                    v-bind:subsession="resultsModel.subsessionId"
                    v-bind:simsession="resultsModel.simsessionId"
                />
            </section>

            <section
                v-if="resultsModel.simsessionType === 'qualify'"
                class="section"
            >
                <header class="section__head">
                    <span class="section__title">Pace</span>
                </header>
                <PaceChart
                    v-bind:subsession="resultsModel.subsessionId"
                    v-bind:simsession="resultsModel.simsessionId"
                    v-bind:league="resultsModel.leagueId"
                />
            </section>

            <section
                v-if="
                    resultsModel.simsessionType === 'qualify' &&
                    resultsModel.hasTelemetry
                "
                class="section"
            >
                <header class="section__head">
                    <span class="section__title">
                        Fastest Lap Cumulative Delta
                    </span>
                </header>
                <BestQualifyLapChart
                    v-bind:subsession="resultsModel.subsessionId"
                    v-bind:simsession="resultsModel.simsessionId"
                    v-bind:league="resultsModel.leagueId"
                />
            </section>

            <section v-if="resultsModel.summary.length > 0" class="section">
                <header class="section__head">
                    <span class="section__title">Race Summary</span>
                </header>
                <div class="summary-body">
                    <PhotoGallery v-bind:photos="galleryPhotos" />
                    <div
                        class="summary-content"
                        v-bind:class="{
                            'summary-content--collapsed': !summaryExpanded,
                        }"
                        v-html="resultsModel.summary[0]"
                    ></div>
                </div>
                <button
                    type="button"
                    class="summary-toggle"
                    @click="summaryExpanded = !summaryExpanded"
                >
                    {{ summaryExpanded ? 'Show less' : 'Read more →' }}
                </button>
            </section>

            <section v-if="highlightPhotos.length" class="section">
                <header class="section__head">
                    <span class="section__title">Highlights</span>
                </header>
                <PhotoCarousel
                    v-bind:id="`highlights-${resultsModel.subsessionId}`"
                    v-bind:photos="highlightPhotos"
                />
            </section>

            <section class="section">
                <header class="section__head">
                    <span class="section__title">Session Report</span>
                </header>
                <GenericTable
                    title=""
                    :leagueId="resultsModel.leagueId"
                    :rows="resultsModel.results"
                    :season-id="resultsModel.seasonId"
                />
            </section>
        </template>
        <section v-else class="section">
            <div class="results-empty">Results not available</div>
        </section>
    </div>
</template>
<style scoped>
.results-empty {
    color: var(--text-muted);
    text-align: center;
    padding: var(--space-6) 0;
    font-size: var(--text-sm);
}

.summary-body {
    /* Clearfix: contains the gallery's floated photo(s) so the
       section's height wraps around them too, not just the text. */
    overflow: hidden;
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
