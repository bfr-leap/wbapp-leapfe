<script setup lang="ts">
import { ref, watch, watchEffect } from 'vue';
import type { Ref } from 'vue';

import { useRoute } from 'vue-router';

import {
    getDefaultNextEventTimerEmbedModel,
    getNextEventTimerEmbedModel,
} from '@/models/next-event-timer-embed-model';
import type { NextEventTimerEmbedModel } from '@/models/next-event-timer-embed-model';
import EventCardLg from '@/components/event-card-lg.vue';
import EventCardSm from '@/components/event-card-sm.vue';

const route = useRoute();

let nextEventTimerEmbedModel: Ref<NextEventTimerEmbedModel> = ref(
    getDefaultNextEventTimerEmbedModel()
);

async function fetchModel() {
    nextEventTimerEmbedModel.value = await getNextEventTimerEmbedModel(
        route.query.league as string,
        route.query.season as string
    );
}
watchEffect(fetchModel);
watch(route, fetchModel);

function onClick(eventInfo: { trackId: string; date: string }) {
    nextEventTimerEmbedModel.value.schedule.selectedRace = {
        trackId: eventInfo.trackId,
        date: eventInfo.date,
        isSelected: false,
    };

    const nextRace = nextEventTimerEmbedModel.value.schedule.nextRace;

    if (
        nextRace.date === eventInfo.date &&
        nextRace.trackId === eventInfo.trackId
    ) {
        nextRace.isSelected = true;
    } else {
        nextRace.isSelected = false;
    }

    for (let race of nextEventTimerEmbedModel.value.schedule.futureRaces) {
        if (
            race.date === eventInfo.date &&
            race.trackId === eventInfo.trackId
        ) {
            race.isSelected = true;
        } else {
            race.isSelected = false;
        }
    }
}
</script>

<template>
    <div class="card bg-dark text-light m-2">
        <div class="card-body p-2">
            <div class="container">
                <div
                    v-if="
                        nextEventTimerEmbedModel.schedule.nextRace.date !== ''
                    "
                    class="row g-1"
                >
                    <div class="col-12 col-sm-3 col-lg-2">
                        <div class="row g-1 flex-sm-column h-100">
                            <div
                                class="col"
                                @click="
                                    onClick(
                                        nextEventTimerEmbedModel.schedule
                                            .nextRace
                                    )
                                "
                            >
                                <EventCardSm
                                    class="h-100"
                                    v-bind:track_id="
                                        nextEventTimerEmbedModel.schedule
                                            .nextRace.trackId
                                    "
                                    v-bind:is_next="true"
                                    v-bind:date="
                                        new Date(
                                            nextEventTimerEmbedModel.schedule.nextRace.date
                                        )
                                    "
                                    v-bind:is_selected="
                                        nextEventTimerEmbedModel.schedule
                                            .nextRace.isSelected
                                    "
                                ></EventCardSm>
                            </div>
                            <div
                                v-for="race in nextEventTimerEmbedModel.schedule
                                    .futureRaces"
                                class="col"
                                @click="onClick(race)"
                            >
                                <EventCardSm
                                    class="h-100"
                                    v-bind:track_id="race.trackId"
                                    v-bind:is_next="false"
                                    v-bind:date="new Date(race.date)"
                                    v-bind:is_selected="race.isSelected"
                                >
                                </EventCardSm>
                            </div>
                        </div>
                    </div>
                    <div class="col-12 col-sm-9 col-lg-10">
                        <EventCardLg
                            v-bind:track_id="
                                nextEventTimerEmbedModel.schedule.selectedRace.trackId.toString()
                            "
                            v-bind:car_id="nextEventTimerEmbedModel.carId"
                            v-bind:league_id="nextEventTimerEmbedModel.leagueId"
                            v-bind:is_next="false"
                            embed_mode
                            v-bind:date="
                                new Date(
                                    nextEventTimerEmbedModel.schedule.selectedRace.date
                                )
                            "
                        ></EventCardLg>
                    </div>
                </div>
                <div v-else>No Future Events</div>
            </div>
        </div>
    </div>
</template>
