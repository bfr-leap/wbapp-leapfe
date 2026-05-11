// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    // SSR is required so social-card unfurlers (Discord, Twitter, etc.) and
    // search engines see a fully rendered HTML response with og:* meta tags
    // already in place. This also unlocks `nuxt-og-image` for OG previews
    // without the custom bot-detection middleware we used to need.
    ssr: true,
    compatibilityDate: '2024-04-03',
    modules: ['nuxt-og-image'],
    // The OG path is fully dynamic (every share-URL is a permutation of
    // /?m=...&league=...&season=...&subsession=...). Disable the module's
    // attempt to enumerate routes for prerender; cards render on demand.
    ogImage: {
        enabled: true,
        runtimeCacheStorage: 'default',
        // `componentDirs` tells the module which directories under
        // `components/` hold OG templates. Files in those dirs have the
        // dir-name prefix stripped and become available under their
        // bare name — `components/LeapOg/Card.vue` registers as
        // `<Card>` for `defineOgImage('Card', { … })`. The `LeapOg`
        // prefix (instead of `OgImage`) is required because Nuxt's
        // component scanner silently skips any file whose pascalName
        // begins with `OgImage` outside the module's own runtime.
        componentDirs: ['OgImage', 'OgImageTemplate', 'LeapOg'],
        defaults: {
            renderer: 'satori',
            extension: 'png',
            width: 1200,
            height: 630,
        },
    },
    css: [
        'bootstrap/dist/css/bootstrap.min.css',
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
