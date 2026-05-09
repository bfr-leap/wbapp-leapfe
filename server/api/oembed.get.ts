/**
 * oEmbed discovery endpoint.
 *
 * Discord (and a few other unfurlers) prefer oEmbed metadata over plain
 * Open Graph when both are advertised — it allows richer card layouts
 * and is the canonical way to declare the share image's intrinsic
 * dimensions. The HTML stub returned by `server/middleware/og-bot.ts`
 * advertises this endpoint via:
 *   <link rel="alternate" type="application/json+oembed" href="...">
 *
 * We respond with the `link` type variant, which mirrors the OG payload
 * the stub already contains — same title, same provider, same image.
 * Discord uses `provider_name` and `author_name` to populate the small
 * "site name" line above the card title, so we stamp the league/season
 * context there when present.
 */

import { buildResultsOgPayload } from '../utils/og-render-results';
import { getRequestOrigin } from '../utils/og-bot';

export default defineEventHandler(async (event) => {
    const query = getQuery(event) as Record<string, string>;
    const mode = (query.m as string) || '';

    let title = 'LEAP — Live Event Analysis and Performance';
    let imageUrl = `${getRequestOrigin(event)}/api/og`;

    if (mode === 'results') {
        const payload = await buildResultsOgPayload(event, query);
        title = payload.title;
        imageUrl = payload.imageUrl;
    }

    setResponseHeader(event, 'content-type', 'application/json; charset=utf-8');
    setResponseHeader(
        event,
        'cache-control',
        'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800'
    );
    return {
        version: '1.0',
        type: 'link',
        provider_name: 'LEAP',
        provider_url: 'https://www.bluefrogracing.com/',
        title,
        thumbnail_url: imageUrl,
        thumbnail_width: 1200,
        thumbnail_height: 630,
    };
});
