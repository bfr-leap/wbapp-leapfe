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
        // Smoke tests (`tests/**`) boot a real Nitro server and need
        // a node-y environment; the regular unit suite needs happy-dom
        // for Vue component tests. Branch on the LEAP_SMOKE flag so
        // each mode picks the right environment.
        environment: process.env.LEAP_SMOKE === '1' ? 'node' : 'happy-dom',
        // The `tests/` directory holds heavy SSR smoke tests that
        // require `nuxt build` to have run. Gate them behind
        // `LEAP_SMOKE=1` so `npm run test` stays fast; `npm run
        // test:smoke` flips the flag and runs them in isolation.
        include:
            process.env.LEAP_SMOKE === '1'
                ? ['tests/**/*.test.ts']
                : [
                      'src/**/*.test.ts',
                      'src/**/*.spec.ts',
                      'server/**/*.test.ts',
                  ],
    },
});
