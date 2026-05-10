/**
 * `og:image` endpoint — renders a 1200×630 social card matching the
 * page the user will see when they click through. Dispatches on the
 * `m` query param to a per-mode renderer via the shared registry;
 * unknown / missing modes get the LEAP brand card.
 *
 * Cards are authored in SVG (much easier than imperative canvas), but
 * served as PNG: Discord, Twitter/X, LinkedIn and similar unfurlers
 * refuse `image/svg+xml` `og:image`s on security grounds and fall back
 * to a generic placeholder, which is the bug this endpoint exists to
 * fix. Rasterization happens in `og-rasterize.ts`.
 *
 * `?format=svg` returns the raw SVG instead — handy when iterating on
 * card layouts locally without round-tripping through the rasterizer.
 */

import { lookupModeRenderer } from '../utils/og-registry';
import {
    CARD_WIDTH,
    CARD_HEIGHT,
    renderCardShell,
    renderEmptyBody,
} from '../utils/og-render-shared';
import { rasterizeSvgToPng } from '../utils/og-rasterize';

function renderBrandCardSvg(): string {
    // Brand fallback — used when the URL has no recognized `m=` mode
    // (or no query params at all). Not built via renderCardShell since
    // it wants a different visual weight: huge "LEAP" wordmark instead
    // of an eyebrow + headline.
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="${CARD_WIDTH}" height="${CARD_HEIGHT}"
     viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b0d10"/>
      <stop offset="100%" stop-color="#161b22"/>
    </linearGradient>
  </defs>
  <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#bg)"/>
  <rect x="0" y="0" width="${CARD_WIDTH}" height="6" fill="#2f81f7"/>
  <g transform="translate(80 280)">
    <text font-family="ui-sans-serif, system-ui, sans-serif"
          font-size="120" font-weight="800" fill="#e6edf3">LEAP</text>
    <text y="60" font-family="ui-sans-serif, system-ui, sans-serif"
          font-size="32" fill="#9aa6b2">Live Event Analysis and Performance</text>
  </g>
  <g transform="translate(80 580)">
    <text font-family="ui-sans-serif, system-ui, sans-serif"
          font-size="18" fill="#6e7681">bluefrogracing.com</text>
  </g>
</svg>`;
}

export default defineEventHandler(async (event) => {
    const query = getQuery(event) as Record<string, string>;
    const mode = (query.m as string) || '';
    const renderer = lookupModeRenderer(mode);

    let svg: string;
    try {
        if (renderer) {
            svg = await renderer.image(event, query);
        } else {
            svg = renderBrandCardSvg();
        }
    } catch (e) {
        console.error('[og] card render failed; serving brand card', e);
        // A defensive last-resort card — same shell as the registered
        // modes use, so a render error still produces something
        // visually consistent rather than a blank or broken response.
        svg = renderCardShell({
            eyebrow: 'LEAP',
            title: 'Live Event Analysis and Performance',
            subtitle: '',
            bodySvg: renderEmptyBody('Open in LEAP'),
        });
    }

    // Race results don't change after the race; cache aggressively at
    // the CDN so each unique URL only renders once. Short browser TTL
    // so manual refresh during testing actually shows changes.
    setResponseHeader(
        event,
        'cache-control',
        'public, max-age=60, s-maxage=86400, stale-while-revalidate=604800'
    );

    if (query.format === 'svg') {
        setResponseHeader(
            event,
            'content-type',
            'image/svg+xml; charset=utf-8'
        );
        return svg;
    }

    try {
        const png = await rasterizeSvgToPng(svg);
        setResponseHeader(event, 'content-type', 'image/png');
        setResponseHeader(event, 'content-length', String(png.length));
        return png;
    } catch (e) {
        // If the native rasterizer is missing or fails, falling back to
        // SVG is still better than a 500 — modern browsers render it
        // when the user opens the image directly, and our cache headers
        // keep the bad render from sticking once resvg is healthy
        // again. The unfurlers won't show a preview, but that's the
        // pre-fix baseline, not a regression.
        console.error('[og] PNG rasterization failed; serving SVG', e);
        setResponseHeader(
            event,
            'content-type',
            'image/svg+xml; charset=utf-8'
        );
        return svg;
    }
});
