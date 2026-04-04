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
    <!-- ── Driver profile header (GitHub org-style) ──────────── -->
    <div class="gh-profile-header">
        <div
            v-bind:class="`driver-img club-${driverProfileModel.memberView.clubId}`"
        ></div>
        <div class="gh-profile-info">
            <DriverTag
                class="fs-4"
                v-bind:lastName="driverProfileModel.memberView.lastName"
                v-bind:firstName="driverProfileModel.memberView.firstName"
                v-bind:licenseLevel="driverProfileModel.memberView.licenseLevel"
                v-bind:iRating="driverProfileModel.memberView.iRating"
                v-bind:safetyRating="driverProfileModel.memberView.safetyRating"
                v-bind:teamName="driverProfileModel.memberView.teamName"
                v-bind:clubId="driverProfileModel.memberView.clubId"
            />
        </div>
    </div>

    <!-- ── DOTD profile blurb ─────────────────────────────────── -->
    <div
        v-if="driverProfileModel.dotdProfile?.blurb"
        class="dotd-profile"
    >
        <h6 class="dotd-profile-header">Driver of the Day Profile</h6>
        <p class="dotd-profile-text">
            {{ driverProfileModel.dotdProfile.blurb }}
        </p>
        <small
            v-if="driverProfileModel.dotdProfile.generated_at"
            class="dotd-profile-footer"
        >
            Generated on:
            {{ driverProfileModel.dotdProfile.generated_at }}
        </small>
    </div>

    <!-- ── Stats & charts panel ──────────────────────────────── -->
    <div class="gh-content-card">
        <Stats
            v-if="driverProfileModel.driverStatsMap?.[0]?.[driverId]"
            :stats="driverProfileModel.driverStatsMap[0][driverId]"
            :results="driverProfileModel.allTimeResults"
            seasonName="All Time"
            v-bind:seasonId="0"
            v-bind:league-id="props.league"
        />
    </div>
</template>

<style scoped>
/* ── GitHub org-style profile header ────────────────────────── */
.gh-profile-header {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 24px 0 16px;
}

.gh-profile-info {
    flex: 1;
    min-width: 0;
}

/* ── DOTD profile blurb ─────────────────────────────────────── */
.dotd-profile {
    padding: 8px 0;
    margin-top: 8px;
}

.dotd-profile-header {
    margin: 0 0 6px;
    font-weight: 600;
    color: var(--gh-text-muted, #8b949e);
}

.dotd-profile-text {
    margin: 0;
    line-height: 1.5;
    color: var(--gh-text-primary, #e6edf3);
}

.dotd-profile-footer {
    display: block;
    margin-top: 6px;
    color: var(--gh-text-muted, #8b949e);
}

/* ── Content card (bordered panel like GitHub README card) ──── */
.gh-content-card {
    border: 1px solid var(--gh-border-default);
    border-radius: var(--gh-radius-md);
    padding: 16px;
    margin-top: 8px;
}

.driver-img {
    height: 64px;
    width: 64px;
    flex-shrink: 0;
    background-color: var(--gh-neutral-emphasis);
    border-radius: var(--gh-radius-full);
    background-size: cover;
    background-position: center;
    box-shadow: 0 0 0 1px var(--gh-border-default);
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
