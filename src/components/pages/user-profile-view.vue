<script setup lang="ts">
import { ref, watch, watchEffect } from 'vue';
import type { Ref } from 'vue';
import { SignedIn, SignedOut, SignInButton, UserButton } from 'vue-clerk';
import { useRoute } from 'vue-router';
import {
    getDefaultUserProfileModel,
    getUserProfileModel,
} from '@@/src/models/pages/user-profile-model';
import type { UserProfileModel } from '@@/src/models/pages/user-profile-model';
import LeagueCardSelector from '@@/src/components/user/league-card-selector.vue';
import IrDriverFinder from '@@/src/components/user/ir-driver-finder.vue';

const route = useRoute();

let userProfileModel: Ref<UserProfileModel> = ref(getDefaultUserProfileModel());

async function fetchModel() {
    userProfileModel.value = await getUserProfileModel();
}

async function onLinked() {
    await fetchModel();
}

watchEffect(fetchModel);
watch(route, fetchModel);
</script>
<template>
    <div class="page">
        <SignedOut>
            <section class="section">
                You must be signed in to access profile functionality
                <SignInButton :as-child="true" v-slot="{ onClick }">
                    <button class="button button--ghost" @click="onClick">
                        Sign In
                    </button>
                </SignInButton>
            </section>
        </SignedOut>

        <SignedIn>
            <section class="section">
                <div class="user-row">
                    <UserButton />
                    <span>Manage user account</span>
                </div>
            </section>

            <section
                v-if="userProfileModel.isVerified === false"
                class="section"
            >
                <header class="section__head">
                    <span class="section__title">Link to iRacing</span>
                </header>
                <p class="form-text">
                    We don't know which driver you are yet. Hop in and pick
                    yourself from the league roster.
                </p>
                <button
                    type="button"
                    class="button button--ghost"
                    data-bs-toggle="modal"
                    data-bs-target="#irDriverFinderModal"
                >
                    Find yourself in the lineup
                </button>
            </section>

            <section v-if="userProfileModel.isVerified" class="section">
                Verified Profile...
            </section>

            <section class="section">
                <header class="section__head">
                    <span class="section__title">My Leagues</span>
                </header>
                <LeagueCardSelector></LeagueCardSelector>
            </section>

            <IrDriverFinder @linked="onLinked" />
        </SignedIn>
    </div>
</template>

<style scoped>
.user-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
}
</style>
