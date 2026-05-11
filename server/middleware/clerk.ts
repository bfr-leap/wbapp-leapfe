import { withClerkMiddleware } from 'h3-clerk';
import { defineEventHandler } from 'h3';

/**
 * Global Clerk middleware. Runs on every request and resolves the
 * caller's auth state into `event.context.auth`.
 *
 * Bypassed via `LEAP_DISABLE_CLERK=1` for the SSR smoke harness. The
 * stub publishable key the harness uses passes basic format checks
 * but Clerk rejects it the moment something actually invokes
 * `authenticateRequest` — which happens on every API endpoint and
 * (critically) on the og-image module's internal page fetch when
 * rendering `/__og-image__/image/og.png`. With the middleware
 * disabled, anonymous SSR works locally end-to-end and the smoke
 * suite can verify the full Discord-unfurl path. Production never
 * sets this flag; the middleware always runs.
 */
export default process.env.LEAP_DISABLE_CLERK === '1'
    ? defineEventHandler((event) => {
          // `plugins/vue-clerk.ts` reads `event.context.auth` during
          // SSR and calls `.getToken()` on it, so the bypass has to
          // hand back at least the minimal anonymous shape it expects
          // — otherwise SSR 500s before the page ever runs and the
          // smoke harness can't reach the OG render path.
          event.context.auth = {
              userId: null,
              sessionId: null,
              getToken: async () => null,
          };
      })
    : withClerkMiddleware();
