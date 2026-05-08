<script setup lang="ts">
import type { Ref } from 'vue';
import { useAuth } from 'vue-clerk';
import EventCardSm from '@@/src/components/event/event-card-sm.vue';
import type { PastEventCardsModel } from '@@/src/models/event/past-events-cards-model';
import {
    getPastEventCardsModel,
    getDefaultPastEventCardsModel,
} from '@@/src/models/event/past-events-cards-model';
import { resolveProtagonistCustId } from '@@/src/models/driver/protagonist';
import RouterLinkProxy from '@@/src/components/nav/router-link-proxy.vue';

const props = defineProps<{
    league: string;
    season: string;
}>();

const { isSignedIn } = useAuth();

async function fetchModel() {
    const irCustId = await resolveProtagonistCustId(
        props.league,
        props.season,
        isSignedIn.value === true
    );
    return await getPastEventCardsModel(props.league, props.season, irCustId);
}

const pastEventCardsModel: Ref<PastEventCardsModel> =
    await asyncDataWithReactiveModel<PastEventCardsModel>(
        `PastEventCardsModel-${[
            props.league,
            props.season,
            isSignedIn.value === true,
        ].join('-')}`,
        fetchModel,
        getDefaultPastEventCardsModel,
        [() => props.league, () => props.season, () => isSignedIn.value]
    );
</script>

<template>
    <div class="row g-1">
        <div class="col-12">
            <div
                v-if="pastEventCardsModel.pastRaces.length"
                class="row g-1 h-100"
            >
                <div v-for="race in pastEventCardsModel.pastRaces" class="col">
                    <RouterLinkProxy
                        :style="{ textDecoration: 'none' }"
                        class="link-light"
                        v-bind:to="`?m=results&league=${props.league}&season=${props.season}&subsession=${race.sessionId}&simsession=${race.simsessionId}`"
                    >
                        <div class="chip-wrap h-100">
                            <EventCardSm
                                class="h-100"
                                v-bind:track_id="race.trackId"
                                v-bind:is_next="false"
                                v-bind:date="new Date(race.date)"
                                v-bind:is_selected="race.isSelected"
                            ></EventCardSm>
                            <span
                                v-if="race.protagonistFinish"
                                class="finish-badge"
                                >P{{ race.protagonistFinish }}</span
                            >
                        </div>
                    </RouterLinkProxy>
                </div>
            </div>
            <div v-else class="row g-1 h-100">
                <div class="col">No events yet</div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.chip-wrap {
    position: relative;
}
.finish-badge {
    position: absolute;
    top: 4px;
    right: 4px;
    z-index: 3;
    font-family: var(--font-mono);
    font-size: 0.7rem;
    font-weight: 700;
    line-height: 1;
    padding: 2px 5px;
    border-radius: var(--radius-sm);
    background: rgba(0, 0, 0, 0.7);
    border: 1px solid var(--border-subtle);
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
    pointer-events: none;
}
</style>
