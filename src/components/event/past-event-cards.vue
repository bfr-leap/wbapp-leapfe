<script setup lang="ts">
import type { Ref } from 'vue';
import EventCardSm from '@@/src/components/event/event-card-sm.vue';
import type { PastEventCardsModel } from '@@/src/models/event/past-events-cards-model';
import {
    getPastEventCardsModel,
    getDefaultPastEventCardsModel,
} from '@@/src/models/event/past-events-cards-model';
import RouterLinkProxy from '@@/src/components/nav/router-link-proxy.vue';

const props = defineProps<{
    league: string;
    season: string;
}>();

async function fetchModel() {
    return await getPastEventCardsModel(props.league, props.season);
}

const pastEventCardsModel: Ref<PastEventCardsModel> =
    await asyncDataWithReactiveModel<PastEventCardsModel>(
        `PastEventCardsModel-${[props.league, props.season].join('-')}`,
        fetchModel,
        getDefaultPastEventCardsModel,
        [() => props.league, () => props.season]
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
                        <EventCardSm
                            class="h-100"
                            v-bind:track_id="race.trackId"
                            v-bind:is_next="false"
                            v-bind:date="new Date(race.date)"
                            v-bind:is_selected="race.isSelected"
                        ></EventCardSm>
                    </RouterLinkProxy>
                </div>
            </div>
            <div v-else class="row g-1 h-100">
                <div class="col">No events yet</div>
            </div>
        </div>
    </div>
</template>
