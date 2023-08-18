<script setup lang="ts">
import Stats from './driver-stats.vue';
import DriverTag from './driver-tag.vue';
import { getMemberViewFromM_Memeber } from './driverUtils';
import { ref, watchEffect, computed } from 'vue';
import type { Ref } from 'vue';
import type { DriverProfileModel } from '@/models/driver-profile-model';
import {
    getDefaultDriverProfileModel,
    getDriverProfileModel,
} from '@/models/driver-profile-model';

const props = defineProps<{
    league: string;
    driver: string;
}>();

let driverProfileModel: Ref<DriverProfileModel> = ref(
    getDefaultDriverProfileModel()
);

watchEffect(async () => {
    driverProfileModel.value = await getDriverProfileModel(
        props.league,
        props.driver
    );
});

const driverId = computed(() => Number.parseInt(props.driver));
const memberView = computed(() => {
    return getMemberViewFromM_Memeber(
        driverProfileModel.value.singleMemberData,
        {},
        {}
    );
});
</script>

<template>
    <div class="card bg-dark text-light m-2 sticky-top">
        <div class="card-body p-2">
            <div class="row p-3">
                <div
                    v-bind:class="`col-1 driver-img club-${memberView.clubId}`"
                ></div>
                <div class="col">
                    <DriverTag
                        class="fs-4"
                        v-bind:lastName="memberView.lastName"
                        v-bind:firstName="memberView.firstName"
                        v-bind:licenseLevel="memberView.licenseLevel"
                        v-bind:iRating="memberView.iRating"
                        v-bind:safetyRating="memberView.safetyRating"
                        v-bind:teamName="memberView.teamName"
                        v-bind:clubId="memberView.clubId"
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
    <template v-for="season in driverProfileModel.leagueSeasons?.seasons">
        <template
            v-if="
                driverProfileModel.driverStatsMap?.[season.season_id]?.[
                    driverId
                ]
            "
        >
            <div class="card bg-dark text-light m-2">
                <div class="card-body p-2">
                    <Stats
                        v-bind:stats="
                            driverProfileModel.driverStatsMap?.[
                                season.season_id
                            ]?.[driverId]
                        "
                        v-bind:results="driverProfileModel.driverResults"
                        v-bind:seasonName="season.season_name"
                        v-bind:seasonId="season.season_id"
                        v-bind:league-id="props.league"
                    />
                </div>
            </div>
        </template>
    </template>
</template>

<style scoped>
.driver-img {
    height: 3em;
    width: 3em;
    background-color: aqua;
    border-radius: 1.5em;
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

.club-50 {
    background-image: url(/flags/southafrica.png);
}

.club-42 {
    background-image: url(/flags/deatch.png);
}
</style>
