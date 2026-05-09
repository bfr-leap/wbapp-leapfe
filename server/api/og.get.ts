/**
 * `og:image` endpoint — renders a 1200×630 social card matching the
 * page the user will see when they click through. Dispatches on the
 * `m` query param to a per-mode renderer; falls back to a generic LEAP
 * brand card for unknown / missing modes.
 *
 * The card is currently SVG. Most major unfurlers (Discord, Slack,
 * Telegram, LinkedIn) accept and proxy SVG `og:image`s; if any platform
 * struggles, swap the renderer here for a rasterized PNG (e.g. via
 * `@resvg/resvg-js`) without touching the middleware that references
 * this endpoint.
 */

import {
    renderResultsCardSvg,
    CARD_WIDTH,
    CARD_HEIGHT,
} from '../utils/og-render-results';
import { escapeSvg } from '../utils/og-bot';

function renderBrandCardSvg(): string {
    const title = 'LEAP';
    const subtitle = 'Live Event Analysis and Performance';
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
          font-size="120" font-weight="800" fill="#e6edf3">
      ${escapeSvg(title)}
    </text>
    <text y="60" font-family="ui-sans-serif, system-ui, sans-serif"
          font-size="32" fill="#9aa6b2">${escapeSvg(subtitle)}</text>
  </g>
  <g transform="translate(80 580)">
    <text font-family="ui-sans-serif, system-ui, sans-serif"
          font-size="18" fill="#6e7681">
      bluefrogracing.com
    </text>
  </g>
</svg>`;
}

export default defineEventHandler(async (event) => {
    const query = getQuery(event) as Record<string, string>;
    const mode = (query.m as string) || '';

    let svg: string;
    try {
        switch (mode) {
            case 'results':
                svg = await renderResultsCardSvg(event, query);
                break;
            default:
                svg = renderBrandCardSvg();
        }
    } catch (e) {
        console.error('[og] card render failed; serving brand card', e);
        svg = renderBrandCardSvg();
    }

    setResponseHeader(event, 'content-type', 'image/svg+xml; charset=utf-8');
    // Race results don't change after the race; cache aggressively at
    // the CDN so each unique URL only renders once. Short browser TTL
    // so manual refresh during testing actually shows changes.
    setResponseHeader(
        event,
        'cache-control',
        'public, max-age=60, s-maxage=86400, stale-while-revalidate=604800'
    );
    return svg;
});
