/**
 * Server-side renderer for `m=results` OG previews.
 *
 * Two outputs feed off the same data fetch:
 *   - `buildResultsOgPayload`  → `{ title, description, ogUrl, imageUrl }`
 *     consumed by the bot-detection middleware to populate `<meta>` tags.
 *   - `renderResultsCardSvg`   → the SVG body inside the shared card
 *     shell, served from `/api/og?m=results&...`.
 *
 * The SVG shell (gradient, accent stripe, header, footer) lives in
 * `og-render-shared.ts`; this file owns the data fetch and the body
 * rows specific to a race-result card (top finishers, gap, points).
 */

import type { H3Event } from 'h3';
import type { SSR_ResultsEntry } from '@@/lplib/endpoint-types/iracing-endpoints';
import {
    fetchSimsessionResults,
    fetchMembersData,
    resolveSubsessionName,
    buildNameLookup,
} from './og-data';
import {
    type OgPayload,
    buildOgUrls,
    renderCardShell,
    renderBodyRow,
    renderEmptyBody,
    podiumBadge,
} from './og-render-shared';

interface ResultsCardData {
    sessionName: string;
    subsessionId: string;
    simsessionId: string;
    rows: { position: number; name: string; gap: string; points: number }[];
}

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
        .slice(0, 6);

    const rows = sortedTop.map((r) => ({
        position: r.position,
        name: lookupName(r.cust_id),
        gap: formatGap(r),
        points: r.points || 0,
    }));

    return { sessionName, subsessionId, simsessionId, rows };
}

export async function buildResultsOgPayload(
    event: H3Event,
    query: Record<string, string>
): Promise<OgPayload> {
    const { ogUrl, imageUrl } = buildOgUrls(event, query);
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

export async function renderResultsCardSvg(
    event: H3Event,
    query: Record<string, string>
): Promise<string> {
    const data = await fetchResultsCardData(event, query);

    const title = data?.sessionName || 'Race Results';
    const subtitle = data
        ? `Subsession ${data.subsessionId} · Simsession ${data.simsessionId}`
        : 'Live Event Analysis and Performance';

    const bodySvg =
        data && data.rows.length > 0
            ? data.rows
                  .map((row, i) =>
                      renderBodyRow({
                          y: 240 + i * 58,
                          label: row.name,
                          valueLeft: row.gap,
                          valueRight: `${row.points} pts`,
                          badge: {
                              text: row.position.toString(),
                              ...podiumBadge(row.position),
                          },
                      })
                  )
                  .join('\n')
            : renderEmptyBody('Results not yet available');

    return renderCardShell({
        eyebrow: 'LEAP · RACE RESULTS',
        title,
        subtitle,
        bodySvg,
    });
}
