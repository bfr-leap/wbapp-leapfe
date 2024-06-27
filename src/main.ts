import { createApp } from 'vue';
import { createPinia } from 'pinia';

import App from './App.vue';
import router from './router';
import mixpanel from 'mixpanel-browser';
import { clerkPlugin, provideClerkToVueApp } from 'vue-clerk'
import { dark } from '@clerk/themes';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!PUBLISHABLE_KEY) {
    throw new Error('Missing Publishable Key')
}

// Enabling the debug mode flag is useful during implementation,
// but it's recommended you remove it for production
mixpanel.init('ef54b5309bb2ad867ef01d2ddc3f1206', { debug: false });

const app = createApp(App);

app.use(clerkPlugin, {
    publishableKey: PUBLISHABLE_KEY,
    appearance: { baseTheme: dark }
});

app.use(createPinia());
app.use(router);

app.mount('#app');
