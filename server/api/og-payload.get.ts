/**
 * Returns the OG card payload (meta + component props) for a given
 * `?m=...` mode + supporting query params. Called from the page's
 * server-side setup so it can register meta tags via `useSeoMeta` and
 * the card via `defineOgImage` for `nuxt-og-image`. Also called
 * indirectly when the OG module fetches the page during an unfurler
 * request — by that point the meta tags are already in the rendered
 * HTML and the module's own renderer fills in the image bytes.
 */

import { buildOgPayloadFromQuery } from '../utils/og-payload';

export default defineEventHandler(async (event) => {
    const raw = getQuery(event);
    const query: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw || {})) {
        if (v == null) continue;
        query[k] = Array.isArray(v) ? String(v[0]) : String(v);
    }

    setResponseHeader(
        event,
        'cache-control',
        'public, max-age=60, s-maxage=86400, stale-while-revalidate=604800'
    );

    return await buildOgPayloadFromQuery(event, query);
});
