<script setup lang="ts">
import { ref, watchEffect, watch, computed } from 'vue';
import type { Ref } from 'vue';
import { useAuth } from 'vue-clerk';
import DriverTag from '@@/src/components/driver/driver-tag.vue';
import {
    getDefaultDriverSpotlightModel,
    getDriverSpotlightModel,
    type DriverSpotlightModel,
} from '@@/src/models/driver/driver-spotlight-model';

const props = defineProps<{
    league: string;
    season: string;
}>();

const { isSignedIn } = useAuth();

const model: Ref<DriverSpotlightModel> = ref(getDefaultDriverSpotlightModel());

async function fetchModel() {
    model.value = await getDriverSpotlightModel(
        props.league,
        props.season,
        isSignedIn.value === true
    );
}

watchEffect(fetchModel);
watch(() => [props.league, props.season, isSignedIn.value], fetchModel);

// Starts hidden and only reveals once the image actually loads, so
// the common no-capture case never shows anything to flicker away
// (borders/gradient/padding only ever appear, never disappear). No
// `loading="lazy"` here deliberately — a lazy image with no layout
// box (display:none) never intersects the viewport, so the browser
// never fetches it and @load/@error never fire, leaving it hidden
// forever.
const heroPhotoUrl = computed(() => model.value.heroPhotoUrl);
const {
    ready: hasPhoto,
    onError: onHeroPhotoError,
    onLoad: onHeroPhotoLoad,
    imgEl: heroPhotoImgEl,
} = useImageFallback(heroPhotoUrl);
</script>

<template>
    <section
        v-if="model.hasDriver && model.driver"
        class="section spotlight"
        :class="{ 'spotlight--has-photo': hasPhoto }"
    >
        <img
            v-if="model.heroPhotoUrl"
            ref="heroPhotoImgEl"
            v-show="hasPhoto"
            class="spotlight__bg"
            v-bind:src="model.heroPhotoUrl"
            alt=""
            @load="onHeroPhotoLoad"
            @error="onHeroPhotoError"
        />

        <header class="section__head spotlight__head">
            <span class="section__title">Driver Spotlight</span>
            <span v-if="model.heroPhotoCaption" class="spotlight__caption">{{
                model.heroPhotoCaption
            }}</span>
        </header>

        <div class="spotlight__body">
            <div class="spotlight__driver">
                <DriverTag
                    v-bind:clubId="model.driver.clubId"
                    v-bind:lastName="model.driver.lastName"
                    v-bind:firstName="model.driver.firstName"
                    v-bind:iRating="model.driver.iRating"
                    v-bind:licenseLevel="model.driver.licenseLevel"
                    v-bind:safetyRating="model.driver.safetyRating"
                    v-bind:teamName="model.driver.teamName"
                    v-bind:driverId="model.driver.custId"
                    v-bind:leagueId="model.leagueId"
                    v-bind:teamId="model.driver.teamId?.toString()"
                />
            </div>

            <div class="spotlight__stats">
                <div class="stat">
                    <div class="stat__value">P{{ model.driver.position }}</div>
                    <div class="stat__label">
                        of {{ model.fieldSize }} in the standings
                    </div>
                </div>
                <div class="stat">
                    <div class="stat__value">
                        {{ model.driver.points }}
                    </div>
                    <div class="stat__label">
                        points<template v-if="model.deltaToAhead !== null">
                            · {{ model.deltaToAhead }} behind P{{
                                model.driver.position - 1
                            }}</template
                        >
                    </div>
                </div>
                <div v-if="model.lastRace" class="stat">
                    <div class="stat__value">
                        P{{ model.lastRace.finishPosition }}
                    </div>
                    <div class="stat__label">
                        at {{ model.lastRace.trackName }}
                        <template v-if="model.lastRace.positionsGained > 0">
                            · gained {{ model.lastRace.positionsGained }} from
                            grid
                        </template>
                        <template
                            v-else-if="model.lastRace.positionsGained < 0"
                        >
                            · lost
                            {{ -model.lastRace.positionsGained }} from grid
                        </template>
                        <template v-else> · held grid </template>
                    </div>
                </div>
            </div>
        </div>
    </section>
</template>

<style scoped>
.spotlight {
    position: relative;
    isolation: isolate;
    overflow: hidden;
}

.spotlight--has-photo {
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-subtle);
    padding: var(--space-3);
}

.spotlight__bg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    opacity: 0.55;
    z-index: 0;
}

.spotlight--has-photo::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
        180deg,
        rgba(0, 0, 0, 0.45) 0%,
        rgba(0, 0, 0, 0.75) 100%
    );
    z-index: 1;
    pointer-events: none;
}

.spotlight__head,
.spotlight__body {
    position: relative;
    z-index: 2;
}

.spotlight__caption {
    margin-left: var(--space-3);
    font-size: 0.8rem;
    color: var(--text-secondary);
    font-style: italic;
}

.spotlight__body {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-3) 0;
}

.spotlight__driver {
    flex: 1 1 240px;
    min-width: 0;
}

.spotlight__stats {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4);
    flex: 2 1 auto;
}

.stat {
    min-width: 120px;
}

.stat__value {
    font-family: var(--font-mono);
    font-size: 1.75rem;
    font-weight: 700;
    line-height: 1.1;
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
}

.stat__label {
    font-size: 0.8rem;
    color: var(--text-secondary);
    margin-top: 2px;
}

.spotlight--has-photo .stat__value,
.spotlight--has-photo .stat__label,
.spotlight--has-photo .spotlight__caption,
.spotlight--has-photo .section__title {
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.85);
}
</style>
