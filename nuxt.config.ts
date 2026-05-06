// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    ssr: false,
    compatibilityDate: '2024-04-03',
    css: [
        '~/src/assets/github-dark-theme.css',
        '~/src/assets/design-tokens.css',
    ],
    devtools: {
        enabled: true,

        timeline: {
            enabled: true,
        },
    },
    runtimeConfig: {
        public: {
            CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY,
            API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000',
            BUILD_COMMIT_SHA:
                process.env.VERCEL_GIT_COMMIT_SHA ||
                process.env.GIT_COMMIT_SHA ||
                'dev',
            BUILD_TIME: new Date().toISOString(),
        },
        CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
        CLERK_JWT_KEY: process.env.CLERK_JWT_KEY,
    },
});
