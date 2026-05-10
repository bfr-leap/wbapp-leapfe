/**
 * oEmbed discovery endpoint.
 *
 * Discord (and a few other unfurlers) prefer oEmbed metadata over plain
 * Open Graph when both are advertised — it allows richer card layouts
 * and is the canonical way to declare the share image's intrinsic
 * dimensions. The HTML stub returned by the bot middleware advertises
 * this endpoint via:
 *   <link rel="alternate" type="application/json+oembed" href="...">
 *
 * We respond with the `link` type variant, which mirrors the OG payload
 * the stub already contains — same title, same provider, same image.
 * Per-mode title/image come from the same registry that drives the
 * HTML stub and `/api/og`, so all three stay in sync.
 */

import { getRequestOrigin } from '../utils/og-bot';
import { lookupModeRenderer } from '../utils/og-registry';

export default defineEventHandler(async (event) => {
    const query = getQuery(event) as Record<string, string>;
    const mode = (query.m as string) || '';
    const renderer = lookupModeRenderer(mode);

    let title = 'LEAP — Live Event Analysis and Performance';
    let imageUrl = `${getRequestOrigin(event)}/api/og`;

    if (renderer) {
        try {
            const payload = await renderer.payload(event, query);
            title = payload.title;
            imageUrl = payload.imageUrl;
        } catch (e) {
            console.error('[oembed] payload build failed; using brand', e);
        }
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
