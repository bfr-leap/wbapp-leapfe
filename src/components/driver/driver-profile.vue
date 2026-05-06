<script setup lang="ts">
import Stats from './driver-stats.vue';
import DriverTag from './driver-tag.vue';
import DriverPenaltySummary from './driver-penalty-summary.vue';
import { computed } from 'vue';
import type { Ref } from 'vue';
import { useRoute } from 'vue-router';
import type { DriverProfileModel } from '@@/src/models/driver/driver-profile-model';
import {
    getDefaultDriverProfileModel,
    getDriverProfileModel,
} from '@@/src/models/driver/driver-profile-model';

const props = defineProps<{
    league: string;
    driver: string;
}>();

const route = useRoute();

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

/**
 * Season for the penalty summary. Prefers an explicit season from the
 * route, otherwise falls back to the most recent season the driver
 * profile model has loaded.
 */
const penaltySeason = computed<string>(() => {
    const fromRoute = route.query.season as string | undefined;
    if (fromRoute) return fromRoute;
    const seasons = driverProfileModel.value?.leagueSeasons?.seasons || [];
    if (seasons.length === 0) return '';
    const newest = [...seasons].sort((a, b) => b.season_id - a.season_id)[0];
    return newest?.season_id?.toString() || '';
});
</script>

<template>
    <div class="page">
        <section class="section profile-header">
            <div
                v-bind:class="`driver-img club-${driverProfileModel.memberView.clubId}`"
            ></div>
            <div class="profile-info">
                <DriverTag
                    class="fs-4"
                    v-bind:lastName="driverProfileModel.memberView.lastName"
                    v-bind:firstName="driverProfileModel.memberView.firstName"
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
        </section>

        <section
            v-if="driverProfileModel.dotdProfile?.blurb"
            class="section"
        >
            <header class="section__head">
                <span class="section__title">Driver of the Day Profile</span>
            </header>
            <p class="dotd-profile-text">
                {{ driverProfileModel.dotdProfile.blurb }}
            </p>
            <small
                v-if="driverProfileModel.dotdProfile.generated_at"
                class="dotd-profile-footer"
            >
                Generated on:
                {{
                    new Date(
                        driverProfileModel.dotdProfile.generated_at
                    ).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    })
                }}
            </small>
        </section>

        <section class="section">
            <Stats
                v-if="driverProfileModel.driverStatsMap?.[0]?.[driverId]"
                :stats="driverProfileModel.driverStatsMap[0][driverId]"
                :results="driverProfileModel.allTimeResults"
                seasonName="All Time"
                v-bind:seasonId="0"
                v-bind:league-id="props.league"
            />
        </section>

        <DriverPenaltySummary
            v-if="penaltySeason"
            v-bind:league="props.league"
            v-bind:season="penaltySeason"
            v-bind:driver="props.driver"
        />
    </div>
</template>

<style scoped>
.profile-header {
    display: flex;
    align-items: center;
    gap: var(--space-4);
}
.profile-info {
    flex: 1;
    min-width: 0;
}

.dotd-profile-text {
    margin: 0;
    line-height: 1.5;
    color: var(--text-primary);
}
.dotd-profile-footer {
    display: block;
    margin-top: var(--space-2);
    text-align: right;
    color: var(--text-muted);
}

.driver-img {
    height: 64px;
    width: 64px;
    flex-shrink: 0;
    background-color: var(--surface-2);
    border: 1px solid var(--border-subtle);
    border-radius: 50%;
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
