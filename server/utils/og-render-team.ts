/**
 * Server-side renderer for `m=team` OG previews.
 *
 * URL params: `league`, `team` (team_id). The card shows the team
 * name as the headline, league + driver count as the subtitle, and
 * the team's roster as body rows (top 6 by team_members order).
 *
 * Driver display names need a separate `singleMemberData` lookup per
 * cust_id since the team info object only carries cust_ids — we
 * resolve them in parallel and accept that anonymous bots see the
 * `#<custId>` fallback for unresolvable members.
 */

import type { H3Event } from 'h3';
import {
    fetchCuratedLeagueTeamsInfo,
    fetchSingleMemberData,
    resolveLeagueSeasonLabel,
    resolveLgSeasSubCtx,
} from './og-data';
import {
    type OgPayload,
    buildOgUrls,
    renderCardShell,
    renderBodyRow,
    renderEmptyBody,
} from './og-render-shared';

interface TeamCardData {
    teamName: string;
    leagueName: string;
    driverNames: string[];
}

async function fetchTeamCardData(
    event: H3Event,
    query: Record<string, string>
): Promise<TeamCardData | null> {
    // `team` is the page identity so it must be in the URL. `league`
    // resolves through the broker — same as the SPA — so a link with
    // just `?m=team&team=...` still finds the team in the curated
    // league's roster.
    const teamId = query.team || '';
    if (!teamId) return null;
    const { league } = await resolveLgSeasSubCtx(event, query);
    if (!league) return null;

    const [teamsInfo, label] = await Promise.all([
        fetchCuratedLeagueTeamsInfo(event, league),
        resolveLeagueSeasonLabel(event, league, ''),
    ]);

    if (!teamsInfo) return null;

    // Search every season's roster for the team — most-recent first so
    // we surface the current roster when the team appears across years.
    const sortedSeasons = [...teamsInfo.seasons].sort(
        (a, b) => b.season_id - a.season_id
    );
    let team = null;
    for (const s of sortedSeasons) {
        const found = s.teams.find((t) => t.team_id.toString() === teamId);
        if (found) {
            team = found;
            break;
        }
    }
    if (!team) return null;

    const memberIds = team.team_members.slice(0, 6);
    const members = await Promise.all(
        memberIds.map((id) => fetchSingleMemberData(event, id.toString()))
    );

    return {
        teamName: team.team_name,
        leagueName: label.leagueName,
        driverNames: members.map(
            (m, i) => m?.display_name || `#${memberIds[i]}`
        ),
    };
}

export async function buildTeamOgPayload(
    event: H3Event,
    query: Record<string, string>
): Promise<OgPayload> {
    const { ogUrl, imageUrl } = buildOgUrls(event, query);
    const data = await fetchTeamCardData(event, query);

    if (!data) {
        return {
            title: 'LEAP — Team Profile',
            description: 'Team roster and standings within the league.',
            ogUrl,
            imageUrl,
        };
    }

    const drivers = data.driverNames.slice(0, 3).join(', ');
    return {
        title: `${data.teamName} — ${data.leagueName}`,
        description: `${data.driverNames.length} drivers · ${drivers}`,
        ogUrl,
        imageUrl,
    };
}

export async function renderTeamCardSvg(
    event: H3Event,
    query: Record<string, string>
): Promise<string> {
    const data = await fetchTeamCardData(event, query);

    const title = data?.teamName || 'Team Profile';
    const subtitle = data
        ? `${data.leagueName} · ${data.driverNames.length} driver${
              data.driverNames.length === 1 ? '' : 's'
          }`
        : 'Team roster and standings';

    const bodySvg =
        data && data.driverNames.length > 0
            ? data.driverNames
                  .map((name, i) =>
                      renderBodyRow({
                          y: 240 + i * 58,
                          label: name,
                          labelMax: 36,
                      })
                  )
                  .join('\n')
            : renderEmptyBody('Team not found in this league');

    return renderCardShell({
        eyebrow: 'LEAP · TEAM PROFILE',
        title,
        subtitle,
        bodySvg,
    });
}
