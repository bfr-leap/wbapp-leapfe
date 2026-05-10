/**
 * Shared SVG primitives + OG payload helper for all per-mode renderers.
 *
 * The card shell — gradient background, accent stripe, eyebrow text,
 * headline, subtitle, footer band — is identical across every page
 * mode (`m=results`, `m=standings`, etc.). Only the body content
 * differs. Extracting the shell here keeps each per-mode renderer
 * focused on its data and layout, and means design tweaks to colors,
 * fonts, or footer copy land in one place.
 *
 * Layout coordinate system: 1200×630 viewport. Body content lives in
 * the rectangle (80, 240) → (1120, 560) — 320px tall, plenty of room
 * for ~6 rows or a stats grid.
 */

import type { H3Event } from 'h3';
import { escapeSvg, getRequestOrigin } from './og-bot';

export interface OgPayload {
    title: string;
    description: string;
    ogUrl: string;
    imageUrl: string;
}

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

/**
 * Build the absolute `og:image` and canonical URL for a request,
 * forwarding the original query string so the image endpoint can
 * re-derive everything from the same inputs.
 */
export function buildOgUrls(
    event: H3Event,
    query: Record<string, string>
): { ogUrl: string; imageUrl: string } {
    const origin = getRequestOrigin(event);
    const ogUrl = `${origin}${event.node.req.url || '/'}`;
    const imageQuery = new URLSearchParams(query).toString();
    const imageUrl = `${origin}/api/og${imageQuery ? '?' + imageQuery : ''}`;
    return { ogUrl, imageUrl };
}

/**
 * Wrap a body SVG fragment in the shared card shell. `bodySvg` is the
 * caller's own group(s) positioned inside the body region; the shell
 * provides everything around it.
 */
export function renderCardShell(opts: {
    eyebrow: string;
    title: string;
    subtitle: string;
    bodySvg: string;
}): string {
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

  <g transform="translate(80 110)">
    <text font-family="ui-sans-serif, system-ui, sans-serif"
          font-size="22" font-weight="600" fill="#2f81f7"
          letter-spacing="2">${escapeSvg(opts.eyebrow)}</text>
    <text y="56" font-family="ui-sans-serif, system-ui, sans-serif"
          font-size="48" font-weight="700" fill="#e6edf3">
      ${escapeSvg(clampLine(opts.title, 36))}
    </text>
    <text y="92" font-family="ui-sans-serif, system-ui, sans-serif"
          font-size="20" fill="#9aa6b2">
      ${escapeSvg(clampLine(opts.subtitle, 70))}
    </text>
  </g>

  ${opts.bodySvg}

  <g transform="translate(80 580)">
    <text font-family="ui-sans-serif, system-ui, sans-serif"
          font-size="18" fill="#6e7681">
      bluefrogracing.com · Live Event Analysis and Performance
    </text>
  </g>
</svg>`;
}

/**
 * Truncate a line of text with an ellipsis when it would overflow its
 * column width. SVG has no native ellipsis — we approximate by
 * character count, calibrated to the font sizes used in the shell.
 */
export function clampLine(s: string, max: number): string {
    if (!s) return '';
    if (s.length <= max) return s;
    return s.slice(0, max - 1) + '…';
}

/**
 * A simple two-column body row used by most modes — left-aligned label,
 * right-aligned value. Position is the y-offset within the SVG (the
 * body region starts at y=240). Optional `badge` paints a colored
 * rounded square to the left, mainly used for podium positions.
 */
export function renderBodyRow(opts: {
    y: number;
    label: string;
    valueLeft?: string;
    valueRight?: string;
    badge?: { text: string; fill: string; textFill: string };
    labelMax?: number;
}): string {
    const labelStart = opts.badge ? 68 : 0;
    const badgeSvg = opts.badge
        ? `
      <rect x="0" y="-30" width="44" height="44" rx="10"
            fill="${opts.badge.fill}"/>
      <text x="22" y="2" text-anchor="middle"
            font-family="ui-sans-serif, system-ui, sans-serif"
            font-size="22" font-weight="700"
            fill="${opts.badge.textFill}">${escapeSvg(opts.badge.text)}</text>`
        : '';
    return `
    <g transform="translate(80 ${opts.y})">
      ${badgeSvg}
      <text x="${labelStart}" y="2"
            font-family="ui-sans-serif, system-ui, sans-serif"
            font-size="26" font-weight="600" fill="#e6edf3">
        ${escapeSvg(clampLine(opts.label, opts.labelMax ?? 28))}
      </text>
      ${
          opts.valueLeft != null
              ? `<text x="820" y="2" text-anchor="end"
            font-family="ui-sans-serif, system-ui, sans-serif"
            font-size="22" fill="#9aa6b2">${escapeSvg(opts.valueLeft)}</text>`
              : ''
      }
      ${
          opts.valueRight != null
              ? `<text x="1040" y="2" text-anchor="end"
            font-family="ui-sans-serif, system-ui, sans-serif"
            font-size="22" font-weight="600" fill="#e6edf3">${escapeSvg(
                opts.valueRight
            )}</text>`
              : ''
      }
    </g>`;
}

/**
 * Standard podium-medal palette for position badges. Returns the
 * background and text fill for a given finishing position; positions
 * 4+ get the neutral surface color.
 */
export function podiumBadge(position: number): {
    fill: string;
    textFill: string;
} {
    if (position === 1) return { fill: '#f6c244', textFill: '#0b0d10' };
    if (position === 2) return { fill: '#c4cdd5', textFill: '#0b0d10' };
    if (position === 3) return { fill: '#cd7f32', textFill: '#0b0d10' };
    return { fill: '#1f2733', textFill: '#e6edf3' };
}

/**
 * Generic "no data yet" body — used by every mode's empty-state path so
 * an unfurl never produces a blank card while the data backend is
 * unreachable or the parameters point at a not-yet-populated entity.
 */
export function renderEmptyBody(
    message = 'Open in LEAP for the latest'
): string {
    return `<text x="600" y="380" text-anchor="middle"
                  font-family="ui-sans-serif, system-ui, sans-serif"
                  font-size="28" fill="#9aa6b2">
              ${escapeSvg(message)}
            </text>`;
}
