<script setup lang="ts">
import { ref, watch, watchEffect } from 'vue';
import type { Ref } from 'vue';
import { useRoute } from 'vue-router';

import { getLeagueSeasonSessions } from '@/fetch-util';

import EventCardSm from '../components/EventCardSm.vue';

const route = useRoute();

const props = defineProps<{
    league: string;
    season: string;
}>();

interface View {
    pastRaces: {
        sessionId: string;
        trackId: string;
        date: string;
        isSelected: boolean;
    }[];
}

let defaultView: View = {
    pastRaces: [],
};

let view: Ref<View> = ref(JSON.parse(JSON.stringify(defaultView)));

async function fectchJsonData() {
    view.value = JSON.parse(JSON.stringify(defaultView));

    if (!props.league || !props.season) {
        return;
    }

    let leagueSeasonSessions = await getLeagueSeasonSessions(
        props.league,
        props.season
    );

    for (let session of leagueSeasonSessions?.sessions) {
        view.value.pastRaces.push({
            trackId: session.track.track_id.toString(),
            date: session.launch_at,
            isSelected: false,
            sessionId: session.subsession_id.toString(),
        });
    }
}

watchEffect(fectchJsonData);
watch(route, fectchJsonData);
</script>

<template>
    <div class="row g-1">
        <div class="col-12">
            <div v-if="view.pastRaces.length" class="row g-1 h-100">
                <div v-for="race in view.pastRaces" class="col">
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
