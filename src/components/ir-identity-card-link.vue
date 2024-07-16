<script setup lang="ts">
import { watchEffect } from 'vue';

async function fetchModel() {}

watchEffect(fetchModel);
</script>
<template>
    <div class="helmet-container">
        <RouterLink class="helmet" to="/?m=profile"></RouterLink>
    </div>
</template>
<style>
.helmet-container {
    display: flex;
}

.helmet {
    background-image: url('/helmet.png');
    background-repeat: no-repeat;
    background-size: contain;
    background-color: transparent;
    border: 0;
    padding: 0;
    margin-right: 0.5em;
    height: 1.75em;
    width: 1.75em;
    border-radius: 1em;
}
</style>
