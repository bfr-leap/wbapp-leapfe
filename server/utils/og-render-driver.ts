/**
 * Server-side renderer for `m=driver` OG previews.
 *
 * URL params: `league`, `driver` (cust_id). The card shows the driver's
 * display name, their team affiliation in the latest season (when one
 * can be resolved), and a four-cell stats grid (started, wins,
 * podiums, top 10s) summed across the league's seasons. Stats come
 * from `LeagueDriverStats` aggregated across all seasons we find the
 * driver in.
 */

import type { H3Event } from 'h3';
import type { DriverStats } from '@@/lplib/endpoint-types/iracing-endpoints';
import {
    fetchSingleMemberData,
    fetchLeagueDriverStats,
    fetchCuratedLeagueTeamsInfo,
    resolveLeagueSeasonLabel,
} from './og-data';
import {
    type OgPayload,
    buildOgUrls,
    renderCardShell,
    renderEmptyBody,
} from './og-render-shared';
import { escapeSvg } from './og-bot';

interface DriverCardData {
    name: string;
    leagueName: string;
    teamName: string | null;
    started: number;
    wins: number;
    podiums: number;
    top10: number;
}

function sumStats(s: DriverStats | undefined, into: DriverCardData) {
    if (!s) return;
    into.started += s.started || 0;
    into.wins += s.wins || 0;
    into.podiums += s.podiums || 0;
    into.top10 += s.top_10 || 0;
}

async function fetchDriverCardData(
    event: H3Event,
    query: Record<string, string>
): Promise<DriverCardData | null> {
    const league = query.league || '';
    const driver = query.driver || '';
    if (!driver) return null;

    const [member, allStats, teamsInfo, label] = await Promise.all([
        fetchSingleMemberData(event, driver),
        league
            ? fetchLeagueDriverStats(event, league)
            : Promise.resolve(null),
        league
            ? fetchCuratedLeagueTeamsInfo(event, league)
            : Promise.resolve(null),
        resolveLeagueSeasonLabel(event, league, ''),
    ]);

    if (!member) return null;

    const data: DriverCardData = {
        name: member.display_name,
        leagueName: label.leagueName,
        teamName: null,
        started: 0,
        wins: 0,
        podiums: 0,
        top10: 0,
    };

    if (allStats) {
        for (const seasonStats of Object.values(allStats)) {
            sumStats(seasonStats[Number(driver)], data);
        }
    }

    // Team affiliation — pick the most recent season where the driver
    // appears on a roster.
    if (teamsInfo) {
        const sortedSeasons = [...teamsInfo.seasons].sort(
            (a, b) => b.season_id - a.season_id
        );
        for (const s of sortedSeasons) {
            const team = s.teams.find((t) =>
                t.team_members.includes(Number(driver))
            );
            if (team) {
                data.teamName = team.team_name;
                break;
            }
        }
    }

    return data;
}

export async function buildDriverOgPayload(
    event: H3Event,
    query: Record<string, string>
): Promise<OgPayload> {
    const { ogUrl, imageUrl } = buildOgUrls(event, query);
    const data = await fetchDriverCardData(event, query);

    if (!data) {
        return {
            title: 'LEAP — Driver Profile',
            description:
                'iRacing driver stats and history within the league.',
            ogUrl,
            imageUrl,
        };
    }

    const teamFragment = data.teamName ? ` · ${data.teamName}` : '';
    return {
        title: `${data.name} — ${data.leagueName}`,
        description: `Started ${data.started} · ${data.wins} wins · ${data.podiums} podiums${teamFragment}`,
        ogUrl,
        imageUrl,
    };
}

/**
 * Stats grid: four cells in a 2×2 layout. Each cell shows a large
 * number above a small label; the layout is hand-positioned to fit
 * snugly inside the body region.
 */
function renderStatGrid(data: DriverCardData): string {
    const cells = [
        { label: 'Starts', value: data.started.toString() },
        { label: 'Wins', value: data.wins.toString() },
        { label: 'Podiums', value: data.podiums.toString() },
        { label: 'Top 10s', value: data.top10.toString() },
    ];
    return cells
        .map((c, i) => {
            const x = 80 + (i % 4) * 260;
            const y = 280;
            return `
    <g transform="translate(${x} ${y})">
      <text font-family="ui-sans-serif, system-ui, sans-serif"
            font-size="64" font-weight="700" fill="#e6edf3">${escapeSvg(c.value)}</text>
      <text y="36" font-family="ui-sans-serif, system-ui, sans-serif"
            font-size="20" fill="#9aa6b2"
            letter-spacing="1">${escapeSvg(c.label.toUpperCase())}</text>
    </g>`;
        })
        .join('\n');
}

export async function renderDriverCardSvg(
    event: H3Event,
    query: Record<string, string>
): Promise<string> {
    const data = await fetchDriverCardData(event, query);

    const title = data?.name || 'Driver Profile';
    const subtitle = data
        ? data.teamName
            ? `${data.leagueName} · ${data.teamName}`
            : data.leagueName
        : 'iRacing driver profile';

    const bodySvg = data
        ? renderStatGrid(data)
        : renderEmptyBody('Driver not found in this league');

    return renderCardShell({
        eyebrow: 'LEAP · DRIVER PROFILE',
        title,
        subtitle,
        bodySvg,
    });
}
