/**
 * Server-side renderer for `m=rulings` OG previews.
 *
 * URL params: `league`, `season`. The card shows the most recent
 * steward rulings for the season — driver name + infraction — sorted
 * newest first. This is the highest-signal preview for a rulings link
 * since the page itself is mostly a chronological ledger.
 */

import type { H3Event } from 'h3';
import { fetchRulings, resolveLeagueSeasonLabel } from './og-data';
import {
    type OgPayload,
    buildOgUrls,
    renderCardShell,
    renderBodyRow,
    renderEmptyBody,
} from './og-render-shared';

interface RulingsCardData {
    leagueName: string;
    seasonLabel: string;
    totalRulings: number;
    recent: { driver: string; infraction: string }[];
}

async function fetchRulingsCardData(
    event: H3Event,
    query: Record<string, string>
): Promise<RulingsCardData | null> {
    const league = query.league || '';
    const season = query.season || '';
    if (!league || !season) return null;

    const [rulings, label] = await Promise.all([
        fetchRulings(event, league, season),
        resolveLeagueSeasonLabel(event, league, season),
    ]);

    // Defensive check: the data broker can return non-array error
    // payloads (e.g. `{ message: 'unauthorized' }`) when the upstream
    // is unreachable or the season has no rulings yet. Treat anything
    // non-array as "no rulings" so the card never crashes.
    if (!Array.isArray(rulings)) {
        return {
            leagueName: label.leagueName,
            seasonLabel: label.seasonLabel,
            totalRulings: 0,
            recent: [],
        };
    }

    // Sort newest-first by ruling_date, then take the top 5.
    const sorted = [...rulings].sort((a, b) => {
        const ta = new Date(a.ruling_date).getTime() || 0;
        const tb = new Date(b.ruling_date).getTime() || 0;
        return tb - ta;
    });

    return {
        leagueName: label.leagueName,
        seasonLabel: label.seasonLabel,
        totalRulings: rulings.length,
        recent: sorted.slice(0, 5).map((r) => ({
            driver: r.driver_name || `#${r.driver_id || '?'}`,
            infraction: r.infraction || r.classification || 'Ruling',
        })),
    };
}

export async function buildRulingsOgPayload(
    event: H3Event,
    query: Record<string, string>
): Promise<OgPayload> {
    const { ogUrl, imageUrl } = buildOgUrls(event, query);
    const data = await fetchRulingsCardData(event, query);

    if (!data) {
        return {
            title: 'LEAP — Steward Rulings',
            description: 'Penalty rulings and steward decisions for the season.',
            ogUrl,
            imageUrl,
        };
    }

    const recentNames = data.recent
        .slice(0, 3)
        .map((r) => r.driver)
        .join(', ');
    return {
        title: `${data.leagueName} — Rulings`,
        description: `${data.seasonLabel} · ${data.totalRulings} ruling${data.totalRulings === 1 ? '' : 's'}${recentNames ? ` · Recent: ${recentNames}` : ''}`,
        ogUrl,
        imageUrl,
    };
}

export async function renderRulingsCardSvg(
    event: H3Event,
    query: Record<string, string>
): Promise<string> {
    const data = await fetchRulingsCardData(event, query);

    const title = data?.leagueName || 'Steward Rulings';
    const subtitle = data
        ? `${data.seasonLabel} · ${data.totalRulings} ruling${data.totalRulings === 1 ? '' : 's'}`
        : 'Penalty rulings and steward decisions';

    const bodySvg =
        data && data.recent.length > 0
            ? data.recent
                  .map((r, i) =>
                      renderBodyRow({
                          y: 240 + i * 58,
                          label: r.driver,
                          valueLeft: r.infraction,
                          labelMax: 26,
                      })
                  )
                  .join('\n')
            : renderEmptyBody('No rulings yet this season');

    return renderCardShell({
        eyebrow: 'LEAP · STEWARD RULINGS',
        title,
        subtitle,
        bodySvg,
    });
}
