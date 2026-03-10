// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
//    ssr: false,
    compatibilityDate: '2024-04-03',
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
        },
        CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
        CLERK_JWT_KEY: process.env.CLERK_JWT_KEY,
    },
});
