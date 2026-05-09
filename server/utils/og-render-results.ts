/**
 * Server-side renderer for `m=results` OG previews.
 *
 * Two outputs feed off the same data fetch:
 *   - `buildResultsOgPayload`  → `{ title, description, ogUrl, imageUrl }`
 *     consumed by the bot-detection middleware to populate `<meta>` tags.
 *   - `renderResultsCardSvg`   → an SVG document used as the `og:image`,
 *     served from `/api/og?m=results&...`.
 *
 * The card layout is a fixed 1200×630 — the canonical "summary_large_image"
 * size that Discord, Twitter, Slack, etc. all crop cleanly. It's intentionally
 * hand-rolled SVG (no Satori/resvg dep): if Discord image-proxying ever
 * struggles with SVG we can swap the rasterizer in here without touching
 * the middleware or layout code.
 */

import type { H3Event } from 'h3';
import type {
    SimsessionResults,
    SSR_ResultsEntry,
} from '@@/lplib/endpoint-types/iracing-endpoints';
import {
    fetchSimsessionResults,
    fetchMembersData,
    resolveSubsessionName,
    buildNameLookup,
} from './og-data';
import { escapeSvg, getRequestOrigin } from './og-bot';

export interface OgPayload {
    title: string;
    description: string;
    ogUrl: string;
    imageUrl: string;
}

interface ResultsCardData {
    sessionName: string;
    leagueId: string;
    seasonId: string;
    subsessionId: string;
    simsessionId: string;
    rows: { position: number; name: string; gap: string; points: number }[];
}

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

/**
 * Format an SSR_ResultsEntry's interval into a Discord-card-friendly gap
 * string. The raw `interval` field is in 10000ths of a second when
 * positive, with -1 used as a sentinel for the leader.
 */
function formatGap(entry: SSR_ResultsEntry): string {
    if (entry.position === 1) return 'leader';
    if (typeof entry.interval !== 'number' || entry.interval < 0) return '—';
    const seconds = entry.interval / 10000;
    if (seconds < 60) return `+${seconds.toFixed(3)}s`;
    const minutes = Math.floor(seconds / 60);
    const remSec = (seconds - minutes * 60).toFixed(3);
    return `+${minutes}:${remSec.padStart(6, '0')}`;
}

async function fetchResultsCardData(
    event: H3Event,
    query: Record<string, string>
): Promise<ResultsCardData | null> {
    const leagueId = query.league || '';
    const seasonId = query.season || '';
    const subsessionId = query.subsession || '';
    // simsession defaults to '0' (typically the race) when absent — the SPA
    // does the same coercion in `index.vue`'s default model.
    const simsessionId = query.simsession || '0';

    if (!subsessionId) return null;

    const [simResults, members, sessionName] = await Promise.all([
        fetchSimsessionResults(event, subsessionId, simsessionId),
        leagueId && seasonId
            ? fetchMembersData(event, leagueId, seasonId)
            : Promise.resolve(null),
        leagueId
            ? resolveSubsessionName(event, leagueId, subsessionId)
            : Promise.resolve(`Subsession ${subsessionId}`),
    ]);

    if (!simResults) return null;

    const lookupName = buildNameLookup(members);

    const sortedTop = [...(simResults.results || [])]
        .filter((r) => typeof r.position === 'number' && r.position >= 1)
        .sort((a, b) => a.position - b.position)
        .slice(0, 8);

    const rows = sortedTop.map((r) => ({
        position: r.position,
        name: lookupName(r.cust_id),
        gap: formatGap(r),
        points: r.points || 0,
    }));

    return {
        sessionName,
        leagueId,
        seasonId,
        subsessionId,
        simsessionId,
        rows,
    };
}

/**
 * Build the OG metadata payload for an `m=results` URL. Values are
 * already escaped for SVG/HTML insertion.
 */
export async function buildResultsOgPayload(
    event: H3Event,
    query: Record<string, string>
): Promise<OgPayload> {
    const origin = getRequestOrigin(event);
    const ogUrl = `${origin}${event.node.req.url || '/'}`;

    // The OG image URL must be absolute and cache-friendly. We forward the
    // exact query string so the image endpoint can re-derive everything.
    const imageQuery = new URLSearchParams(query).toString();
    const imageUrl = `${origin}/api/og?${imageQuery}`;

    const data = await fetchResultsCardData(event, query);

    if (!data || data.rows.length === 0) {
        return {
            title: 'LEAP — Race Results',
            description:
                'Live Event Analysis and Performance — sim racing results, standings, and analytics.',
            ogUrl,
            imageUrl,
        };
    }

    const podium = data.rows
        .slice(0, 3)
        .map((r) => `${r.position}. ${r.name}`)
        .join(' · ');
    return {
        title: `${data.sessionName} — Race Results`,
        description: podium
            ? `Top finishers: ${podium}`
            : 'Race results and analysis.',
        ogUrl,
        imageUrl,
    };
}

// ---------------------------------------------------------------------------
// SVG card rendering
// ---------------------------------------------------------------------------

/**
 * Truncate a name with an ellipsis if it would overrun its row width.
 * SVG has no native ellipsis, so we estimate by character count — at the
 * card's font size a reasonable cap of ~28 characters keeps long names
 * from colliding with the gap column.
 */
function clampName(name: string, max = 28): string {
    if (name.length <= max) return name;
    return name.slice(0, max - 1) + '…';
}

function renderRow(row: ResultsCardData['rows'][number], y: number): string {
    const posBadgeFill =
        row.position === 1
            ? '#f6c244'
            : row.position === 2
            ? '#c4cdd5'
            : row.position === 3
            ? '#cd7f32'
            : '#1f2733';
    const posTextFill = row.position <= 3 ? '#0b0d10' : '#e6edf3';
    return `
    <g transform="translate(80 ${y})">
      <rect x="0" y="-30" width="44" height="44" rx="10"
            fill="${posBadgeFill}"/>
      <text x="22" y="2" text-anchor="middle"
            font-family="ui-sans-serif, system-ui, sans-serif"
            font-size="22" font-weight="700"
            fill="${posTextFill}">${row.position}</text>
      <text x="68" y="2"
            font-family="ui-sans-serif, system-ui, sans-serif"
            font-size="26" font-weight="600" fill="#e6edf3">
        ${escapeSvg(clampName(row.name))}
      </text>
      <text x="820" y="2" text-anchor="end"
            font-family="ui-sans-serif, system-ui, sans-serif"
            font-size="22" fill="#9aa6b2">${escapeSvg(row.gap)}</text>
      <text x="1040" y="2" text-anchor="end"
            font-family="ui-sans-serif, system-ui, sans-serif"
            font-size="22" font-weight="600" fill="#e6edf3">
        ${row.points} pts
      </text>
    </g>`;
}

/**
 * Render the 1200×630 SVG OG card. Falls back to a generic LEAP card if
 * the underlying data fetch returned no results — better than a blank
 * preview when the subsession is invalid or pre-race.
 */
export async function renderResultsCardSvg(
    event: H3Event,
    query: Record<string, string>
): Promise<string> {
    const data = await fetchResultsCardData(event, query);

    const title = data?.sessionName || 'Race Results';
    const subtitle = data
        ? `Subsession ${data.subsessionId} · Simsession ${data.simsessionId}`
        : 'LEAP — Live Event Analysis and Performance';

    const rowsSvg =
        data && data.rows.length > 0
            ? data.rows
                  .slice(0, 6)
                  .map((row, i) => renderRow(row, 240 + i * 58))
                  .join('\n')
            : `<text x="600" y="380" text-anchor="middle"
                     font-family="ui-sans-serif, system-ui, sans-serif"
                     font-size="28" fill="#9aa6b2">
                 Results not yet available
               </text>`;

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
          letter-spacing="2">LEAP · RACE RESULTS</text>
    <text y="56" font-family="ui-sans-serif, system-ui, sans-serif"
          font-size="48" font-weight="700" fill="#e6edf3">
      ${escapeSvg(title)}
    </text>
    <text y="92" font-family="ui-sans-serif, system-ui, sans-serif"
          font-size="20" fill="#9aa6b2">${escapeSvg(subtitle)}</text>
  </g>

  ${rowsSvg}

  <g transform="translate(80 580)">
    <text font-family="ui-sans-serif, system-ui, sans-serif"
          font-size="18" fill="#6e7681">
      bluefrogracing.com · Live Event Analysis and Performance
    </text>
  </g>
</svg>`;
}
