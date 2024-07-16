import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [vue()],
    base: '/',
    resolve: {
        alias: {
            lplib: fileURLToPath(new URL('./lplib', import.meta.url)),
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
});
