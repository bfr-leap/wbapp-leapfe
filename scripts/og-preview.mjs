#!/usr/bin/env node
/**
 * Local preview tool for OG cards.
 *
 * Usage:
 *   node scripts/og-preview.mjs results            # uses built-in fixture
 *   node scripts/og-preview.mjs home
 *   node scripts/og-preview.mjs standings
 *   node scripts/og-preview.mjs driver
 *   node scripts/og-preview.mjs all                # writes one PNG per mode
 *
 * Renders the same SVG card shells the live `/api/og` endpoint does,
 * but with hard-coded fixture data so it runs without a Nitro server,
 * Clerk keys, or broker connectivity. Output goes to `tmp/og-preview/`.
 *
 * The point: catch font / layout / rasterizer regressions BEFORE
 * deploying. If the PNG that lands here looks broken, the one Discord
 * fetches will too.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const fontDir = resolve(repoRoot, 'server/assets');
const outDir = resolve(repoRoot, 'tmp/og-preview');

const fontBuffers = [
    'og-font-400.woff2',
    'og-font-600.woff2',
    'og-font-700.woff2',
].map((n) => readFileSync(resolve(fontDir, n)));

// Inline minimal copies of renderCardShell + renderBodyRow + podiumBadge
// rather than importing the .ts source; this script is intentionally
// dependency-light so it works without a build step. If you tweak the
// real renderers, mirror the change here when iterating locally.
const W = 1200;
const H = 630;

function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function shell({ eyebrow, title, subtitle, bodySvg }) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b0d10"/>
      <stop offset="100%" stop-color="#161b22"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="0" y="0" width="${W}" height="6" fill="#2f81f7"/>
  <g transform="translate(80 110)">
    <text font-family="ui-sans-serif, system-ui, sans-serif" font-size="22" font-weight="600" fill="#2f81f7" letter-spacing="2">${esc(
        eyebrow
    )}</text>
    <text y="56" font-family="ui-sans-serif, system-ui, sans-serif" font-size="48" font-weight="700" fill="#e6edf3">${esc(
        title
    )}</text>
    <text y="92" font-family="ui-sans-serif, system-ui, sans-serif" font-size="20" fill="#9aa6b2">${esc(
        subtitle
    )}</text>
  </g>
  ${bodySvg}
  <g transform="translate(80 580)">
    <text font-family="ui-sans-serif, system-ui, sans-serif" font-size="18" fill="#6e7681">bluefrogracing.com · Live Event Analysis and Performance</text>
  </g>
</svg>`;
}

function podium(p) {
    if (p === 1) return { fill: '#f6c244', textFill: '#0b0d10' };
    if (p === 2) return { fill: '#c4cdd5', textFill: '#0b0d10' };
    if (p === 3) return { fill: '#cd7f32', textFill: '#0b0d10' };
    return { fill: '#1f2733', textFill: '#e6edf3' };
}

function row({ y, label, valueLeft, valueRight, badge }) {
    const labelStart = badge ? 68 : 0;
    const badgeSvg = badge
        ? `<rect x="0" y="-30" width="44" height="44" rx="10" fill="${
              badge.fill
          }"/>
           <text x="22" y="2" text-anchor="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="22" font-weight="700" fill="${
               badge.textFill
           }">${esc(badge.text)}</text>`
        : '';
    const left =
        valueLeft != null
            ? `<text x="820" y="2" text-anchor="end" font-family="ui-sans-serif, system-ui, sans-serif" font-size="22" fill="#9aa6b2">${esc(
                  valueLeft
              )}</text>`
            : '';
    const right =
        valueRight != null
            ? `<text x="1040" y="2" text-anchor="end" font-family="ui-sans-serif, system-ui, sans-serif" font-size="22" font-weight="600" fill="#e6edf3">${esc(
                  valueRight
              )}</text>`
            : '';
    return `<g transform="translate(80 ${y})">${badgeSvg}<text x="${labelStart}" y="2" font-family="ui-sans-serif, system-ui, sans-serif" font-size="26" font-weight="600" fill="#e6edf3">${esc(
        label
    )}</text>${left}${right}</g>`;
}

const FIXTURES = {
    home: () =>
        shell({
            eyebrow: 'LEAP · LEAGUE HOME',
            title: 'League Zero',
            subtitle: 'Season 131502 · Next race: Hungaroring · Fri, May 15',
            bodySvg: [
                { name: 'Hungaroring', date: 'Fri, May 15' },
                { name: 'Spa-Francorchamps', date: 'Fri, May 22' },
                { name: 'Monza', date: 'Fri, May 29' },
                { name: 'Silverstone', date: 'Fri, Jun 5' },
            ]
                .map((e, i) =>
                    row({ y: 240 + i * 58, label: e.name, valueRight: e.date })
                )
                .join('\n'),
        }),
    results: () =>
        shell({
            eyebrow: 'LEAP · RACE RESULTS',
            title: 'St. Petersburg Grand Prix - Super Formula SF23 - Honda',
            subtitle: 'Subsession 85228727 · Simsession 0',
            bodySvg: [
                { name: 'Elliot Rolls', gap: 'leader', pts: 30 },
                { name: 'Jaden Calloway', gap: '+1.234s', pts: 24 },
                { name: 'Antonio Bianchi', gap: '+5.678s', pts: 21 },
                { name: 'Marcus Webb', gap: '+12.500s', pts: 18 },
                { name: 'Sven Halvorsen', gap: '+18.220s', pts: 16 },
            ]
                .map((r, i) =>
                    row({
                        y: 240 + i * 58,
                        label: r.name,
                        valueLeft: r.gap,
                        valueRight: `${r.pts} pts`,
                        badge: { text: String(i + 1), ...podium(i + 1) },
                    })
                )
                .join('\n'),
        }),
    standings: () =>
        shell({
            eyebrow: 'LEAP · DRIVER STANDINGS',
            title: 'League Zero',
            subtitle: 'Season 131502',
            bodySvg: [
                { n: 'Elliot Rolls', p: 142 },
                { n: 'Jaden Calloway', p: 128 },
                { n: 'Antonio Bianchi', p: 119 },
                { n: 'Marcus Webb', p: 102 },
                { n: 'Sven Halvorsen', p: 98 },
            ]
                .map((r, i) =>
                    row({
                        y: 240 + i * 58,
                        label: r.n,
                        valueRight: `${r.p} pts`,
                        badge: { text: String(i + 1), ...podium(i + 1) },
                    })
                )
                .join('\n'),
        }),
    driver: () => {
        const stats = [
            ['Starts', '47'],
            ['Wins', '8'],
            ['Podiums', '21'],
            ['Top 10s', '39'],
        ];
        const grid = stats
            .map(([label, value], i) => {
                const x = 80 + (i % 4) * 260;
                return `<g transform="translate(${x} 280)">
                          <text font-family="ui-sans-serif, system-ui, sans-serif" font-size="64" font-weight="700" fill="#e6edf3">${esc(
                              value
                          )}</text>
                          <text y="36" font-family="ui-sans-serif, system-ui, sans-serif" font-size="20" fill="#9aa6b2" letter-spacing="1">${esc(
                              label.toUpperCase()
                          )}</text>
                        </g>`;
            })
            .join('');
        return shell({
            eyebrow: 'LEAP · DRIVER PROFILE',
            title: 'Elliot Rolls',
            subtitle: 'League Zero · Apex Racing',
            bodySvg: grid,
        });
    },
};

function render(mode) {
    const make = FIXTURES[mode];
    if (!make) {
        const known = Object.keys(FIXTURES).join(', ');
        throw new Error(`Unknown mode "${mode}". Try: ${known}, or "all".`);
    }
    const svg = make();
    const png = new Resvg(svg, {
        fitTo: { mode: 'width', value: W },
        font: {
            fontBuffers,
            loadSystemFonts: false,
            defaultFontFamily: 'Inter',
        },
        background: '#0b0d10',
    })
        .render()
        .asPng();

    mkdirSync(outDir, { recursive: true });
    const outPath = resolve(outDir, `${mode}.png`);
    writeFileSync(outPath, png);
    console.log(`${mode}: ${outPath} (${png.length} bytes)`);
}

const arg = process.argv[2] || 'all';
if (arg === 'all') {
    for (const m of Object.keys(FIXTURES)) render(m);
} else {
    render(arg);
}
