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
        {
            rel: 'stylesheet',
            href: 'https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css',
            integrity:
                'sha384-rbsA2VBKQhggwzxH7pPCaAqO46MgnOM80zW1RWuH61DGLwZJEdK2Kadq2F9CUG65',
            crossorigin: 'anonymous',
        },
    ],
    script: [
        {
            src: 'https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js',
            integrity:
                'sha384-kenU1KFdBIe4zVF0s0G1M5b4hcpxyD9F7jL+jjXkk+Q2h455rYXK/7HAuoJl+0I4',
            crossorigin: 'anonymous',
            body: true,
        },
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
.bg-toplevel {
    background-color: rgb(38, 38, 42);
}

.table-dark {
    --bs-table-bg: rgb(31, 31, 35);
}

.bg-nav {
    background-color: rgb(19, 19, 22);
}

.btn-dark {
    --bs-btn-bg: rgb(31, 31, 35);
    --bs-btn-border-color: rgb(31, 31, 35);
}

:root {
    --bs-dark-rgb: 31, 31, 35;
}
</style>
