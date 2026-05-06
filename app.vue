<script setup lang="ts">
import { setApiBaseURL } from '@@/src/utils/fetch-util';
useHead({
    bodyAttrs: {
        class: 'bg-toplevel',
    },
    title: 'LEAP | Live Event Analysis and Performance',
    link: [
        {
            rel: 'icon',
            href: 'blue-frog-racing-s4-icon.png',
        },
    ],
    script: [
        {
            src: 'https://cdn.jsdelivr.net/npm/prismjs@1/components/prism-core.min.js',
            defer: true,
        },
        {
            src: 'https://cdn.jsdelivr.net/npm/prismjs@1/plugins/autoloader/prism-autoloader.min.js',
            defer: true,
        },
    ],
});

const config = useRuntimeConfig();
setApiBaseURL(config.public.API_BASE_URL);
</script>

<template>
    <NuxtPage />
</template>

<style>
/* Theme styles are loaded from src/assets/github-dark-theme.css via nuxt.config */
</style>
