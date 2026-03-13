<script setup lang="ts">
import { watchEffect } from 'vue';
import RouterLinkProxy from '@@/src/components/nav/router-link-proxy.vue';

async function fetchModel() {}

watchEffect(fetchModel);
</script>
<template>
    <div class="helmet-container">
        <RouterLinkProxy class="helmet" to="/?m=profile"></RouterLinkProxy>
    </div>
</template>
<style>
.helmet-container {
    display: flex;
    align-items: center;
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
    border-radius: var(--gh-radius-full);
    opacity: 0.85;
    transition: opacity 0.12s ease;
}

.helmet:hover {
    opacity: 1;
}
</style>
