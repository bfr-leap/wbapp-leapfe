<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Ref } from 'vue';
import EventCardLg from '@@/src/components/event/event-card-lg.vue';
import EventCardSm from '@@/src/components/event/event-card-sm.vue';
import DriverStandings from '@@/src/components/driver/driver-standings.vue';
import DriverSpotlight from '@@/src/components/driver/driver-spotlight.vue';
import PastEventCards from '../event/past-event-cards.vue';
import LatestRaceSummary from '../event/latest-race-summary.vue';
import type { HomeModel } from '@@/src/models/pages/home-model';
import {
    getDefaultHomeModel,
    getHomeModel,
} from '@@/src/models/pages/home-model';
import type { PastEventCardEntry } from '@@/src/models/event/past-events-cards-model';
import { getPastEventCardsModel } from '@@/src/models/event/past-events-cards-model';
import { resolveProtagonistCustId } from '@@/src/models/driver/protagonist';
import { venueKey } from '@@/src/utils/track-utils';
import {
    getCuratedTrackDisplayInfo,
    getTrackInfoDirectory,
} from '@@/src/utils/fetch-util';
import type {
    CuratedTrackDisplayhInfo,
    TrackInfoDirectory,
} from 'lplib/endpoint-types/iracing-endpoints';
import { SignedIn, SignedOut, SignInButton } from 'vue-clerk';
import { useAuth } from 'vue-clerk';
import { useRoute } from 'vue-router';
import RouterLinkProxy from '@@/src/components/nav/router-link-proxy.vue';

const { isSignedIn } = useAuth();
const route = useRoute();
const showDebug = computed(() => !!route.query.debug);
const debugStatus = ref('');

const props = defineProps<{
    league: string;
    season: string;
    subsession: string;
}>();

async function fetchModel() {
    return await getHomeModel(
        props.league,
        props.season,
        isSignedIn.value === true
    );
}

const homeModel: Ref<HomeModel> = await asyncDataWithReactiveModel<HomeModel>(
    `homeViewPageModel-${[props.league, props.season, isSignedIn.value === true]
        .map((v) => v.toString())
        .join('-')}`,
    fetchModel,
    getDefaultHomeModel,
    [() => props.league, () => props.season, () => props.subsession]
);

const protagonistRaces: Ref<PastEventCardEntry[]> = ref([]);
const trackDisplayInfo: Ref<CuratedTrackDisplayhInfo | null> = ref(null);
const leagueTrackDirectory: Ref<TrackInfoDirectory | null> = ref(null);
const protagonistCustIdRef: Ref<string> = ref('');

watch(
    () => [
        homeModel.value.leagueId,
        homeModel.value.seasonId,
        isSignedIn.value,
    ],
    async () => {
        const { leagueId, seasonId } = homeModel.value;
        if (!leagueId || !seasonId) {
            protagonistRaces.value = [];
            return;
        }
        const irCustId = await resolveProtagonistCustId(
            leagueId,
            seasonId,
            isSignedIn.value === true
        );
        protagonistCustIdRef.value = irCustId;
        const [past, display, directory] = await Promise.all([
            irCustId
                ? getPastEventCardsModel(leagueId, seasonId, irCustId)
                : Promise.resolve(null),
            getCuratedTrackDisplayInfo(),
            getTrackInfoDirectory(leagueId),
        ]);
        protagonistRaces.value = past?.pastRaces ?? [];
        trackDisplayInfo.value = display ?? null;
        leagueTrackDirectory.value = directory ?? null;
    },
    { immediate: true }
);

const lastTimeHere = computed(() => {
    const trackId = homeModel.value.selectedRace?.trackId?.toString();
    if (!trackId) return null;
    const targetVenue = venueKey(
        trackId,
        trackDisplayInfo.value,
        leagueTrackDirectory.value
    );
    const matches = protagonistRaces.value
        .filter(
            (r) =>
                venueKey(
                    r.trackId,
                    trackDisplayInfo.value,
                    leagueTrackDirectory.value
                ) === targetVenue &&
                r.protagonistFinish !== undefined &&
                r.date
        )
        .sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
    return matches[0] ?? null;
});

function onClick(eventInfo: { trackId: string; date: string }) {
    homeModel.value.selectedRace = {
        trackId: eventInfo.trackId,
        date: eventInfo.date,
        isSelected: false,
    };

    if (
        homeModel.value.nextRace.date === eventInfo.date &&
        homeModel.value.nextRace.trackId === eventInfo.trackId
    ) {
        homeModel.value.nextRace.isSelected = true;
    } else {
        homeModel.value.nextRace.isSelected = false;
    }

    for (let race of homeModel.value.futureRaces) {
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

function buildDebugPayload() {
    const selectedTrackId =
        homeModel.value.selectedRace?.trackId?.toString() || '';
    return {
        isSignedIn: isSignedIn.value === true,
        leagueId: homeModel.value.leagueId,
        seasonId: homeModel.value.seasonId,
        protagonistCustId: protagonistCustIdRef.value,
        selectedRace: {
            trackId: selectedTrackId,
            venueKey: venueKey(
                selectedTrackId,
                trackDisplayInfo.value,
                leagueTrackDirectory.value
            ),
            inCurated: !!trackDisplayInfo.value?.[selectedTrackId],
            inLeagueDirectory:
                !!leagueTrackDirectory.value?.track_display?.[selectedTrackId],
            curatedShort:
                trackDisplayInfo.value?.[selectedTrackId]?.short_display ??
                null,
            directoryName:
                leagueTrackDirectory.value?.track_display?.[selectedTrackId] ??
                null,
        },
        protagonistRaces: protagonistRaces.value.map((r) => ({
            trackId: r.trackId,
            venueKey: venueKey(
                r.trackId,
                trackDisplayInfo.value,
                leagueTrackDirectory.value
            ),
            finish: r.protagonistFinish ?? null,
            date: r.date,
            inCurated: !!trackDisplayInfo.value?.[r.trackId],
            inLeagueDirectory:
                !!leagueTrackDirectory.value?.track_display?.[r.trackId],
        })),
        lastTimeHere: lastTimeHere.value,
    };
}

async function copyDebug() {
    const json = JSON.stringify(buildDebugPayload(), null, 2);
    try {
        await navigator.clipboard.writeText(json);
        debugStatus.value = 'Copied!';
    } catch {
        // Clipboard API can fail on insecure origins or restricted browsers.
        // Fall back to a prompt the user can manually copy from.
        try {
            window.prompt('Copy this debug payload:', json);
            debugStatus.value = 'Prompt shown';
        } catch {
            debugStatus.value = 'Failed';
        }
    }
    setTimeout(() => {
        debugStatus.value = '';
    }, 2000);
}
</script>

<template>
    <div class="page">
        <section
            v-if="homeModel.nextRace.date"
            class="section section--featured"
        >
            <header class="section__head">
                <span class="section__title">Up Next</span>
                <span v-if="lastTimeHere" class="section__hint">
                    Last time here: P{{ lastTimeHere.protagonistFinish }}
                </span>
                <button
                    v-if="showDebug"
                    type="button"
                    class="debug-btn"
                    @click="copyDebug"
                >
                    {{ debugStatus || 'Copy debug' }}
                </button>
                <SignedIn>
                    <RouterLinkProxy
                        v-if="homeModel.allowEditCalendar"
                        class="section__more"
                        type="button"
                        v-bind:to="`/?m=season-cdr-admin&league=${$props.league}&season=${$props.season}`"
                    >
                        Edit Calendar
                    </RouterLinkProxy>
                </SignedIn>
            </header>
            <div v-if="homeModel.nextRace.date !== ''" class="row g-1">
                <div class="col-12 col-sm-3 col-lg-2">
                    <div class="row g-1 flex-sm-column h-100 event-strip">
                        <div class="col" @click="onClick(homeModel.nextRace)">
                            <EventCardSm
                                class="h-100"
                                v-bind:track_id="homeModel.nextRace.trackId"
                                v-bind:is_next="true"
                                v-bind:date="new Date(homeModel.nextRace.date)"
                                v-bind:is_selected="
                                    homeModel.nextRace.isSelected
                                "
                            ></EventCardSm>
                        </div>
                        <div
                            v-for="race in homeModel.futureRaces"
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
                            homeModel.selectedRace?.trackId?.toString()
                        "
                        v-bind:car_id="homeModel.carId"
                        v-bind:league_id="homeModel.leagueId"
                        v-bind:is_next="false"
                        v-bind:date="new Date(homeModel.selectedRace.date)"
                    ></EventCardLg>
                </div>
            </div>
            <div v-else>No Future Events</div>
        </section>

        <DriverSpotlight
            v-if="homeModel.seasonId && homeModel.leagueId"
            :key="`sp-${homeModel.leagueId}-${homeModel.seasonId}`"
            v-bind:league="homeModel.leagueId"
            v-bind:season="homeModel.seasonId"
        />

        <LatestRaceSummary
            v-if="homeModel.leagueId && homeModel.seasonId"
            v-bind:league="homeModel.leagueId"
            v-bind:season="homeModel.seasonId"
        />

        <section
            v-if="homeModel.leagueId && homeModel.seasonId"
            class="section"
        >
            <header class="section__head">
                <span class="section__title">Past Events</span>
            </header>
            <PastEventCards
                v-bind:league="homeModel.leagueId"
                v-bind:season="homeModel.seasonId"
                v-bind:car="homeModel.carId"
            />
        </section>

        <DriverStandings
            v-if="homeModel.seasonId && homeModel.leagueId"
            :key="`ds-${homeModel.leagueId}-${homeModel.seasonId}`"
            summary_mode
            v-bind:season="homeModel.seasonId"
            v-bind:league="homeModel.leagueId"
        />

        <section class="section">
            <RouterLinkProxy
                v-if="homeModel.seasonId && homeModel.leagueId"
                class="section__more"
                v-bind:to="`?m=season&league=${homeModel.leagueId}&season=${homeModel.seasonId}`"
                >See More Season Details →</RouterLinkProxy
            >
        </section>
    </div>
</template>

<style scoped>
.section__hint {
    margin-left: var(--space-3);
    font-size: 0.85rem;
    color: var(--text-secondary);
    font-variant-numeric: tabular-nums;
}

.debug-btn {
    margin-left: var(--space-3);
    font-size: 0.75rem;
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-subtle);
    background: rgba(255, 255, 255, 0.04);
    color: var(--text-secondary);
    font-family: var(--font-mono);
    cursor: pointer;
}
.debug-btn:hover {
    background: rgba(255, 255, 255, 0.08);
}

/* Make the small-event-card column stretch its children to fill
   the height of the EventCardLg next to it. Bootstrap's .col with
   flex:1 0 0% in a column-direction flex container distributes
   space, but height:100% on a grandchild (the EventCardSm wrapper)
   doesn't always resolve in nested flex layouts — making each
   .col itself a flex column whose child grows to fill makes the
   stretch reliable across browsers. */
@media (min-width: 576px) {
    .event-strip > .col {
        display: flex;
        flex-direction: column;
    }
    .event-strip > .col > * {
        flex: 1 1 auto;
        min-height: 0;
    }
}
</style>
