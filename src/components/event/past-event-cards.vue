<script setup lang="ts">
import { ref, watch, watchEffect } from 'vue';
import type { Ref } from 'vue';
import { useRoute } from 'vue-router';
import EventCardSm from '@/components/event/event-card-sm.vue';
import type { PastEventCardsModel } from '../../models/event/past-events-cards-model';
import {
    getPastEventCardsModel,
    getDefaultPastEventCardsModel,
} from '../../models/event/past-events-cards-model';

const route = useRoute();

const props = defineProps<{
    league: string;
    season: string;
}>();

let pastEventCardsModel: Ref<PastEventCardsModel> = ref(
    getDefaultPastEventCardsModel()
);

async function fetchModel() {
    pastEventCardsModel.value = await getPastEventCardsModel(
        props.league,
        props.season
    );
}

watchEffect(fetchModel);
watch(route, fetchModel);
</script>

<template>
    <div class="row g-1">
        <div class="col-12">
            <div
                v-if="pastEventCardsModel.pastRaces.length"
                class="row g-1 h-100"
            >
                <div v-for="race in pastEventCardsModel.pastRaces" class="col">
                    <RouterLink
                        style="text-decoration: none"
                        class="link-light"
                        v-bind:to="`?m=results&league=${props.league}&season=${props.season}&subsession=${race.sessionId}&simsession=0`"
                    >
                        <EventCardSm
                            class="h-100"
                            v-bind:track_id="race.trackId"
                            v-bind:is_next="false"
                            v-bind:date="new Date(race.date)"
                            v-bind:is_selected="race.isSelected"
                        ></EventCardSm>
                    </RouterLink>
                </div>
            </div>
            <div v-else class="row g-1 h-100">
                <div class="col">No events yet</div>
            </div>
        </div>
    </div>
</template>
