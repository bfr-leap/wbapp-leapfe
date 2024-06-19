import { createApp } from 'vue';
import { createPinia } from 'pinia';

import App from './App.vue';
import router from './router';

import mixpanel from 'mixpanel-browser';

// Enabling the debug mode flag is useful during implementation,
// but it's recommended you remove it for production
mixpanel.init('ef54b5309bb2ad867ef01d2ddc3f1206', { debug: false });

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.mount('#app');
