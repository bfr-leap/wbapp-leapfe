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
    <SignedOut>
        <div class="card bg-dark text-light m-2">
            <div class="card-body p-2">
                You must be signed in to access profile functionality
                <SignInButton />
            </div>
        </div>
    </SignedOut>

    <SignedIn>
        <div class="card bg-dark text-light m-2">
            <div class="card-body p-2">
                <table>
                    <tbody>
                        <tr>
                            <td>
                                <UserButton />
                            </td>
                            <td></td>
                            <td>Manage user account</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        <div
            v-if="userProfileModel.isVerified === false"
            class="card bg-dark text-light m-2"
        >
            <div class="card-body p-2">
                Link to iRacing
                <p></p>
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
                            class="btn btn-primary"
                        >
                            Submit
                        </button>
                        <button
                            v-else
                            type="submit"
                            class="btn btn-primary"
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

                <span v-if="userProfileModel.msgSent"><br /></span>
                <div v-if="userProfileModel.msgSent" class="row g-3">
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
                            class="btn btn-primary"
                        >
                            Submit
                        </button>
                        <button
                            v-else
                            type="submit"
                            class="btn btn-primary"
                            disabled
                        >
                            Submit
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div
            v-if="userProfileModel.isVerified"
            class="card bg-dark text-light m-2"
        >
            <div class="card-body p-2">Verified Profile...</div>
        </div>

        <div class="card bg-dark text-light m-2">
            <div class="card-body p-2">
                My Leagues
                <div class="container">
                    <div style="height: 1em"></div>
                    <div class="row g-1">
                        <div class="col-12">
                            <div class="row g-1 h-100">
                                <LeagueCardSelector></LeagueCardSelector>
                            </div>
                        </div>
                    </div>
                    <div style="height: 1em"></div>
                </div>
            </div>
        </div>
    </SignedIn>
</template>
