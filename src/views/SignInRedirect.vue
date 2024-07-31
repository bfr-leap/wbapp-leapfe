<script setup lang="ts">
import { RedirectToSignUp, SignedOut, SignedIn } from 'vue-clerk';
import { useRouter } from 'vue-router';
import { watchEffect } from 'vue';
import { useAuth } from 'vue-clerk';

const auth = useAuth();
const router = useRouter();

async function fetchModel() {
    let localStorageValue = localStorage.getItem('redirect-target');
    console.log(localStorageValue);
    if (auth.isSignedIn.value === true) {
        router.push(localStorageValue ? localStorageValue : '/');
    }
}

watchEffect(fetchModel);
</script>

<template>
    <SignedOut>
        <RedirectToSignUp></RedirectToSignUp>
    </SignedOut>
    <SignedIn> loading... </SignedIn>
</template>
