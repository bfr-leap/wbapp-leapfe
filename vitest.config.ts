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
        // `LEAP_SMOKE=1` switches between two mutually-exclusive
        // include sets: the unit suite under `src/**` + `server/**`,
        // or the SSR smoke suite under `tests/**`. `npm test` runs
        // both in sequence (`vitest run && nuxt build && LEAP_SMOKE=1
        // vitest run`) so a single command covers everything.
        // `npm run test:smoke` flips the flag for smoke-only runs
        // when iterating on the harness.
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
