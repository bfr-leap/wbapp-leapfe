/**
 * Server-side renderer for `m=track` OG previews.
 *
 * URL params: `league`, `car`, `track`. Surfaces the track + car combo
 * as the headline and a short table of fastest race laps as the body
 * (the most "lookup-worthy" section on the SPA's track page).
 *
 * Track and car display names come from the league's track-info
 * directory; the lap records come from the per-(league, car, track)
 * `trackResults` document.
 */

import type { H3Event } from 'h3';
import { fetchTrackStats, fetchTrackInfoDirectory } from './og-data';
import {
    type OgPayload,
    buildOgUrls,
    renderCardShell,
    renderBodyRow,
    renderEmptyBody,
    podiumBadge,
} from './og-render-shared';

interface TrackCardData {
    trackName: string;
    carName: string;
    leagueName: string;
    fastestLaps: { driver: string; time: string }[];
}

/**
 * The fastest_race_lap table has rows like
 * `{ driver: 'Foo Bar', time: '1:23.456', date: '...' }`. Field names
 * vary slightly across seasons; we accept either `time` or `lap_time`.
 */
function extractFastestLaps(
    rows: { [name: string]: string }[] | undefined,
    keys: string[] | undefined
): { driver: string; time: string }[] {
    if (!rows) return [];
    const driverKey =
        (keys || []).find((k) => /driver|name/i.test(k)) || 'driver';
    const timeKey =
        (keys || []).find((k) => /lap.?time|^time$/i.test(k)) || 'time';
    return rows.slice(0, 5).map((r) => ({
        driver: r[driverKey] || '—',
        time: r[timeKey] || '—',
    }));
}

async function fetchTrackCardData(
    event: H3Event,
    query: Record<string, string>
): Promise<TrackCardData | null> {
    const league = query.league || '';
    const car = query.car || '';
    const track = query.track || '';
    if (!league || !car || !track) return null;

    const [stats, info] = await Promise.all([
        fetchTrackStats(event, league, car, track),
        fetchTrackInfoDirectory(event, league),
    ]);

    if (!stats) return null;

    const trackName =
        info?.track_display?.[track] ||
        stats.display_name ||
        `Track ${track}`;
    const carName = info?.car_display?.[car] || `Car ${car}`;
    const leagueName = info?.league_name || `League ${league}`;

    return {
        trackName,
        carName,
        leagueName,
        fastestLaps: extractFastestLaps(
            stats.fastest_race_lap?.rows,
            stats.fastest_race_lap?.keys
        ),
    };
}

export async function buildTrackOgPayload(
    event: H3Event,
    query: Record<string, string>
): Promise<OgPayload> {
    const { ogUrl, imageUrl } = buildOgUrls(event, query);
    const data = await fetchTrackCardData(event, query);

    if (!data) {
        return {
            title: 'LEAP — Track Stats',
            description: 'Lap records, poles, and finishes for the league.',
            ogUrl,
            imageUrl,
        };
    }

    const top = data.fastestLaps[0];
    const desc = top
        ? `Fastest lap: ${top.driver} (${top.time}) · ${data.carName}`
        : `${data.carName} · ${data.leagueName}`;
    return {
        title: `${data.trackName} — ${data.carName}`,
        description: desc,
        ogUrl,
        imageUrl,
    };
}

export async function renderTrackCardSvg(
    event: H3Event,
    query: Record<string, string>
): Promise<string> {
    const data = await fetchTrackCardData(event, query);

    const title = data?.trackName || 'Track Stats';
    const subtitle = data
        ? `${data.carName} · ${data.leagueName}`
        : 'Lap records and finishes';

    const bodySvg =
        data && data.fastestLaps.length > 0
            ? data.fastestLaps
                  .map((lap, i) =>
                      renderBodyRow({
                          y: 240 + i * 58,
                          label: lap.driver,
                          valueRight: lap.time,
                          badge: {
                              text: (i + 1).toString(),
                              ...podiumBadge(i + 1),
                          },
                      })
                  )
                  .join('\n')
            : renderEmptyBody('No lap records yet');

    return renderCardShell({
        eyebrow: 'LEAP · TRACK STATS',
        title,
        subtitle,
        bodySvg,
    });
}
