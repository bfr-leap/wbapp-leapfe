import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@@': resolve(__dirname, '.'),
            lplib: resolve(__dirname, 'lplib'),
        },
    },
    test: {
        globals: true,
        environment: 'happy-dom',
        include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    },
});
