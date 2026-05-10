/**
 * Server-side renderer for `m=season` OG previews.
 *
 * URL params: `league`, `season`. The season profile page in the SPA
 * is broad — it covers events, standings, and stats — so the OG card
 * picks the most "at a glance" piece: the league/season label and the
 * upcoming-events list, identical in shape to the home card.
 *
 * If the season has finished (no future events), the body falls back
 * to the most recent past races so the card still has substance.
 */

import type { H3Event } from 'h3';
import {
    fetchActiveLeagueSchedule,
    fetchTrackInfoDirectory,
    resolveLeagueSeasonLabel,
} from './og-data';
import {
    type OgPayload,
    buildOgUrls,
    renderCardShell,
    renderBodyRow,
    renderEmptyBody,
} from './og-render-shared';

interface SeasonCardData {
    leagueName: string;
    seasonLabel: string;
    events: { trackName: string; date: string; isPast: boolean }[];
}

function formatRaceDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });
}

async function fetchSeasonCardData(
    event: H3Event,
    query: Record<string, string>
): Promise<SeasonCardData | null> {
    const league = query.league || '';
    const season = query.season || '';
    if (!league || !season) return null;

    const [schedule, trackInfo, label] = await Promise.all([
        fetchActiveLeagueSchedule(event),
        fetchTrackInfoDirectory(event, league),
        resolveLeagueSeasonLabel(event, league, season),
    ]);

    const leagueInfo = schedule?.leagues.find(
        (l) => l.league_id.toString() === league
    );
    const seasonInfo = leagueInfo?.seasons.find(
        (s) => s.season_id.toString() === season
    );

    if (!seasonInfo) {
        return {
            leagueName: label.leagueName,
            seasonLabel: label.seasonLabel,
            events: [],
        };
    }

    const trackName = (trackId: number): string =>
        trackInfo?.track_display?.[trackId.toString()] || `Track ${trackId}`;

    const now = Date.now();
    const upcoming = seasonInfo.events
        .filter((e) => new Date(e.time).getTime() > now)
        .slice(0, 4);
    // Fall back to the four most recent past events when the season has
    // already finished — chronological tail beats an empty body.
    const events =
        upcoming.length > 0
            ? upcoming.map((e) => ({
                  trackName: trackName(e.track_id),
                  date: formatRaceDate(e.time),
                  isPast: false,
              }))
            : seasonInfo.events
                  .filter((e) => new Date(e.time).getTime() <= now)
                  .slice(-4)
                  .map((e) => ({
                      trackName: trackName(e.track_id),
                      date: formatRaceDate(e.time),
                      isPast: true,
                  }));

    return {
        leagueName: label.leagueName,
        seasonLabel: label.seasonLabel,
        events,
    };
}

export async function buildSeasonOgPayload(
    event: H3Event,
    query: Record<string, string>
): Promise<OgPayload> {
    const { ogUrl, imageUrl } = buildOgUrls(event, query);
    const data = await fetchSeasonCardData(event, query);

    if (!data) {
        return {
            title: 'LEAP — Season Profile',
            description:
                'Season schedule, standings, and stats for the league.',
            ogUrl,
            imageUrl,
        };
    }

    const peek = data.events
        .slice(0, 2)
        .map((e) => `${e.trackName} (${e.date})`)
        .join(' · ');
    return {
        title: `${data.leagueName} — ${data.seasonLabel}`,
        description: peek || 'Open in LEAP for the full schedule',
        ogUrl,
        imageUrl,
    };
}

export async function renderSeasonCardSvg(
    event: H3Event,
    query: Record<string, string>
): Promise<string> {
    const data = await fetchSeasonCardData(event, query);

    const title = data?.leagueName || 'Season Profile';
    const subtitle = data
        ? `${data.seasonLabel}${data.events.length > 0 && data.events[0].isPast ? ' · Recent races' : ''}`
        : 'Season schedule and standings';

    const bodySvg =
        data && data.events.length > 0
            ? data.events
                  .map((e, i) =>
                      renderBodyRow({
                          y: 240 + i * 58,
                          label: e.trackName,
                          valueRight: e.date,
                          labelMax: 36,
                      })
                  )
                  .join('\n')
            : renderEmptyBody('Open in LEAP to see the schedule');

    return renderCardShell({
        eyebrow: 'LEAP · SEASON PROFILE',
        title,
        subtitle,
        bodySvg,
    });
}
