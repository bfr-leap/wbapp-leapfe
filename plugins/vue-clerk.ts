import { clerkPlugin } from 'vue-clerk';
import type { AuthObject } from '@clerk/backend/internal';
import { dark } from '@clerk/themes';
import { createPinia } from 'pinia';
import { useRuntimeConfig } from '#app';

export default defineNuxtPlugin(async (nuxtApp) => {
    const config = useRuntimeConfig();
    const PUBLISHABLE_KEY = config.public.CLERK_PUBLISHABLE_KEY;

    const { publishableKey } = useRuntimeConfig().public;
    const serverInitialState = useState<AuthObject | undefined>(
        'clerk-initial-state',
        () => undefined
    );

    // Installing the `withClerkMiddleware` from `h3-clerk` adds an `auth` object to the context.
    // We can then use the `auth` object to get the initial state of the user.
    if (import.meta.server) {
        const authContext = useRequestEvent()?.context.auth;
        authContext.token = await authContext.getToken();

        serverInitialState.value = authContext
            ? pruneUnserializableFields(authContext)
            : undefined;
    }

    nuxtApp.vueApp.use(clerkPlugin, {
        publishableKey: PUBLISHABLE_KEY,
        appearance: { baseTheme: dark },
    });

    nuxtApp.vueApp.use(createPinia());
});

function pruneUnserializableFields(authContext: AuthObject) {
    return JSON.parse(JSON.stringify(authContext));
}
