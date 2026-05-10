/**
 * Server-side renderer for `m=standings` OG previews.
 *
 * The card surfaces the top 5 drivers in a season's championship by
 * power points, mirroring how the SPA's standings table sorts. Driver
 * names come from `MembersData` and points from `LeagueDriverStats`,
 * keyed on the season id.
 */

import type { H3Event } from 'h3';
import {
    fetchMembersData,
    fetchLeagueDriverStats,
    resolveLeagueSeasonLabel,
    resolveLgSeasSubCtx,
} from './og-data';
import {
    type OgPayload,
    buildOgUrls,
    renderCardShell,
    renderBodyRow,
    renderEmptyBody,
    podiumBadge,
} from './og-render-shared';

interface StandingsCardData {
    leagueName: string;
    seasonLabel: string;
    rows: { position: number; name: string; points: number }[];
}

async function fetchStandingsCardData(
    event: H3Event,
    query: Record<string, string>
): Promise<StandingsCardData | null> {
    // Mirror the SPA's default-context resolution so a bare
    // `/?m=standings` (or `/?m=standings&league=4534` without season)
    // lands on the curated default instead of returning a brand card.
    const { league, season } = await resolveLgSeasSubCtx(event, query);
    if (!league || !season) return null;

    const [members, allStats, label] = await Promise.all([
        fetchMembersData(event, league, season),
        fetchLeagueDriverStats(event, league),
        resolveLeagueSeasonLabel(event, league, season),
    ]);

    const seasonStats = allStats?.[Number(season)];
    if (!members || !seasonStats) {
        return {
            leagueName: label.leagueName,
            seasonLabel: label.seasonLabel,
            rows: [],
        };
    }

    // Sort by power_points descending (matches the SPA's primary sort).
    // Drivers without stats fall to the bottom.
    const ranked = [...members.members]
        .map((m) => ({
            name: m.display_name,
            points: seasonStats[m.cust_id]?.power_points ?? 0,
        }))
        .filter((r) => r.points > 0)
        .sort((a, b) => b.points - a.points)
        .slice(0, 5);

    return {
        leagueName: label.leagueName,
        seasonLabel: label.seasonLabel,
        rows: ranked.map((r, i) => ({ position: i + 1, ...r })),
    };
}

export async function buildStandingsOgPayload(
    event: H3Event,
    query: Record<string, string>
): Promise<OgPayload> {
    const { ogUrl, imageUrl } = buildOgUrls(event, query);
    const data = await fetchStandingsCardData(event, query);

    if (!data || data.rows.length === 0) {
        return {
            title: 'LEAP — Driver Standings',
            description:
                'Championship standings for the season — sorted by power points.',
            ogUrl,
            imageUrl,
        };
    }

    const top3 = data.rows
        .slice(0, 3)
        .map((r) => `${r.position}. ${r.name}`)
        .join(' · ');
    return {
        title: `${data.leagueName} — Standings`,
        description: `${data.seasonLabel} · ${top3}`,
        ogUrl,
        imageUrl,
    };
}

export async function renderStandingsCardSvg(
    event: H3Event,
    query: Record<string, string>
): Promise<string> {
    const data = await fetchStandingsCardData(event, query);

    const title = data?.leagueName || 'Driver Standings';
    const subtitle = data?.seasonLabel || 'Championship standings';

    const bodySvg =
        data && data.rows.length > 0
            ? data.rows
                  .map((row, i) =>
                      renderBodyRow({
                          y: 240 + i * 58,
                          label: row.name,
                          valueRight: `${row.points} pts`,
                          badge: {
                              text: row.position.toString(),
                              ...podiumBadge(row.position),
                          },
                      })
                  )
                  .join('\n')
            : renderEmptyBody('Standings not yet available');

    return renderCardShell({
        eyebrow: 'LEAP · DRIVER STANDINGS',
        title,
        subtitle,
        bodySvg,
    });
}
