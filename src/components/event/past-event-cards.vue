<script setup lang="ts">
import type { Ref } from 'vue';
import { useAuth } from 'vue-clerk';
import EventCardPast from '@@/src/components/event/event-card-past.vue';
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
    <div
        v-if="pastEventCardsModel.pastRaces.length"
        class="row g-2 g-md-3 past-grid"
    >
        <div
            v-for="race in pastEventCardsModel.pastRaces"
            v-bind:key="race.sessionId"
            class="col-12 col-sm-6 col-lg-4"
        >
            <RouterLinkProxy
                :style="{ textDecoration: 'none', display: 'block' }"
                class="link-light card-link"
                v-bind:to="`?m=results&league=${props.league}&season=${props.season}&subsession=${race.sessionId}&simsession=${race.simsessionId}`"
            >
                <EventCardPast
                    v-bind:track_id="race.trackId"
                    v-bind:date="new Date(race.date)"
                    v-bind:is_selected="race.isSelected"
                    v-bind:winner_name="race.winnerName"
                    v-bind:headline="race.headline"
                    v-bind:protagonist_finish="race.protagonistFinish"
                    v-bind:subsession_id="race.sessionId"
                />
            </RouterLinkProxy>
        </div>
    </div>
    <div v-else class="past-empty">No events yet</div>
</template>

<style scoped>
.card-link {
    height: 100%;
}
.past-empty {
    padding: 1rem;
    color: var(--text-muted, var(--text-primary));
    opacity: 0.7;
    font-style: italic;
}
</style>
