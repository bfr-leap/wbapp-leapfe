<script setup lang="ts">
import { ref, reactive, watch, watchEffect } from 'vue';
import type { Ref } from 'vue';
import { SignedIn, SignedOut, SignInButton, UserButton } from 'vue-clerk';
import { useRoute } from 'vue-router';
import {
    getDefaultUserProfileModel,
    getUserProfileModel,
    sendCustId,
    sendVerification,
} from '@@/src/models/pages/user-profile-model';
import type { UserProfileModel } from '@@/src/models/pages/user-profile-model';
import LeagueCardSelector from '@@/src/components/user/league-card-selector.vue';

const route = useRoute();

let userProfileModel: Ref<UserProfileModel> = ref(getDefaultUserProfileModel());

let forms = reactive({ custId: '', verificationNum: '' });

async function fetchModel() {
    userProfileModel.value = await getUserProfileModel();
    forms.custId = userProfileModel.value.irCustId;
}

async function onSubmitCustId(event: MouseEvent) {
    userProfileModel.value.enableCustIdSendButton =
        userProfileModel.value.enableVerifySendButton = false;
    userProfileModel.value = await sendCustId(forms.custId);
}

async function onSubmitVerificationNum(event: MouseEvent) {
    userProfileModel.value.enableCustIdSendButton =
        userProfileModel.value.enableVerifySendButton = false;
    userProfileModel.value = await sendVerification(
        Number.parseInt(forms.verificationNum)
    );
}

watchEffect(fetchModel);
watch(route, fetchModel);
</script>
<template>
    <div class="page">
        <SignedOut>
            <section class="section">
                You must be signed in to access profile functionality
                <SignInButton>
                    <button class="button button--ghost">Sign In</button>
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
                <div class="row g-3">
                    <div class="col-4">
                        <label for="iRacingCustId" class="form-label"
                            >Cust Id:</label
                        >
                    </div>
                    <div class="col-auto">
                        <input
                            type="text"
                            class="form-control"
                            id="iRacingCustId"
                            aria-describedby="custIdHelp"
                            v-model="forms.custId"
                        />
                    </div>
                    <div class="col-auto">
                        <button
                            @click="onSubmitCustId"
                            v-if="
                                userProfileModel.enableCustIdSendButton &&
                                userProfileModel.irCustId !== forms.custId
                            "
                            type="submit"
                            class="button button--ghost"
                        >
                            Submit
                        </button>
                        <button
                            v-else
                            type="submit"
                            class="button button--ghost"
                            disabled
                        >
                            Submit
                        </button>
                    </div>
                    <div class="col-auto">
                        <div id="custIdHelp" class="form-text">
                            We'll send you an iRacing PM
                        </div>
                    </div>
                </div>

                <div v-if="userProfileModel.msgSent" class="row g-3 mt-2">
                    <div class="col-4">
                        <label for="exampleInputEmail1" class="form-label"
                            >Verification Code:</label
                        >
                    </div>
                    <div class="col-auto">
                        <input
                            type="text"
                            class="form-control"
                            id="verificationCodeInput"
                            aria-describedby="verificationCodeHelp"
                            v-model="forms.verificationNum"
                        />
                    </div>

                    <div class="col-auto">
                        <button
                            @click="onSubmitVerificationNum"
                            v-if="
                                userProfileModel.enableVerifySendButton &&
                                forms.verificationNum
                            "
                            type="submit"
                            class="button button--ghost"
                        >
                            Submit
                        </button>
                        <button
                            v-else
                            type="submit"
                            class="button button--ghost"
                            disabled
                        >
                            Submit
                        </button>
                    </div>
                </div>
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
