<script setup lang="ts">
import { ref, watchEffect, watch } from 'vue';
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
</script>

<template>
    <section v-if="model.hasDriver && model.driver" class="section spotlight">
        <header class="section__head">
            <span class="section__title">Driver Spotlight</span>
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
</style>
