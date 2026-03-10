import { createApp } from 'vue';
import { createPinia } from 'pinia';

import App from './App.vue';
import router from './router';

import { clerkPlugin, provideClerkToVueApp } from 'vue-clerk';
import { dark } from '@clerk/themes';

const PUBLISHABLE_KEY = import.meta.env.CLERK_PUBLISHABLE_KEY;
if (!PUBLISHABLE_KEY) {
    throw new Error('Missing Publishable Key');
}


const app = createApp(App);

app.use(clerkPlugin, {
    publishableKey: PUBLISHABLE_KEY,
    appearance: { baseTheme: dark },
});

app.use(createPinia());
app.use(router);

app.mount('#app');
