<script setup lang="ts">
import Stats from './driver-stats.vue';
import DriverTag from './driver-tag.vue';
import { computed } from 'vue';
import type { Ref } from 'vue';
import type { DriverProfileModel } from '@@/src/models/driver/driver-profile-model';
import {
    getDefaultDriverProfileModel,
    getDriverProfileModel,
} from '@@/src/models/driver/driver-profile-model';

const props = defineProps<{
    league: string;
    driver: string;
}>();

async function fetchModelData() {
    return await getDriverProfileModel(props.league, props.driver);
}

const driverId = computed(() => Number.parseInt(props.driver));

const driverProfileModel: Ref<DriverProfileModel> =
    await asyncDataWithReactiveModel<DriverProfileModel>(
        `DriverProfileModel-${props.league}-${props.driver}`,
        fetchModelData,
        getDefaultDriverProfileModel,
        [() => props.league, () => props.driver]
    );
</script>

<template>
    <div class="card bg-dark text-light m-2 sticky-top">
        <div class="card-body p-2">
            <div class="row p-3">
                <div
                    v-bind:class="`col-1 driver-img club-${driverProfileModel.memberView.clubId}`"
                ></div>
                <div class="col">
                    <DriverTag
                        class="fs-4"
                        v-bind:lastName="driverProfileModel.memberView.lastName"
                        v-bind:firstName="
                            driverProfileModel.memberView.firstName
                        "
                        v-bind:licenseLevel="
                            driverProfileModel.memberView.licenseLevel
                        "
                        v-bind:iRating="driverProfileModel.memberView.iRating"
                        v-bind:safetyRating="
                            driverProfileModel.memberView.safetyRating
                        "
                        v-bind:teamName="driverProfileModel.memberView.teamName"
                        v-bind:clubId="driverProfileModel.memberView.clubId"
                    />
                </div>
            </div>
        </div>
    </div>
    <div class="card bg-dark text-light m-2">
        <div class="card-body p-2">
            <Stats
                v-if="driverProfileModel.driverStatsMap?.[0]?.[driverId]"
                :stats="driverProfileModel.driverStatsMap[0][driverId]"
                :results="driverProfileModel.allTimeResults"
                seasonName="All Time"
                v-bind:seasonId="0"
                v-bind:league-id="props.league"
            />
        </div>
    </div>
</template>

<style scoped>
.driver-img {
    height: 3em;
    width: 3em;
    background-color: var(--gh-neutral-emphasis);
    border-radius: var(--gh-radius-full);
    background-size: cover;
    background-position: center;
}

.club-30,
.club-14,
.club-6,
.club-27,
.club-23,
.club-28,
.club-23,
.club-17,
.club-33,
.club-26,
.club-22,
.club-29,
.club-16,
.club-12,
.club-21,
.club-32 {
    background-image: url(/flags/usa.png);
}

.club-36 {
    background-image: url(/flags/ukandi.jpg);
}

.club-44 {
    background-image: url(/flags/finland.png);
}

.club-1 {
    background-image: url(/flags/international.png);
}

.club-43 {
    background-image: url(/flags/scandinavia.png);
}

.club-40 {
    background-image: url(/flags/benelux.png);
}

.club-46 {
    background-image: url(/flags/europe.png);
}

.club-45 {
    background-image: url(/flags/brazil.png);
}

.club-41 {
    background-image: url(/flags/italy.png);
}

.club-38 {
    background-image: url(/flags/iberia.png);
}

.club-34 {
    background-image: url(/flags/australia.png);
}

.club-15 {
    background-image: url(/flags/canada.png);
}

.club-39 {
    background-image: url(/flags/france.png);
}

.club-24 {
    background-image: url(/flags/hispanoamerica.jpg);
}

.club-48 {
    background-image: url(/flags/japan.jpg);
}

.club-19 {
    background-image: url(/flags/usa.png);
}

.club-47 {
    background-image: url(/flags/asia.jpg);
}

.club-50 {
    background-image: url(/flags/southafrica.png);
}

.club-42 {
    background-image: url(/flags/deatch.png);
}
</style>
@/utils/driver-utils
