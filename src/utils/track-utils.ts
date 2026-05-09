import { getCuratedTrackDisplayInfo } from './fetch-util';
import type {
    CuratedTrackDisplayhInfo,
    TrackInfoDirectory,
} from 'lplib/endpoint-types/iracing-endpoints';

/**
 * Returns a venue-stable key for a trackId so different layouts of the same
 * circuit (e.g. Hungaroring GP vs short) compare equal.
 *
 * Resolution order, most venue-stable first:
 *   1. League TrackInfoDirectory.track_display name (parens stripped,
 *      lowercased) — typically the bare venue name.
 *   2. Curated short_display (e.g. "HRNG") — usually consistent across
 *      configs, but not always (some venues get distinct shorts per layout),
 *      so we only fall back to it.
 *   3. Raw trackId.
 */
export function venueKey(
    trackId: string,
    curated: CuratedTrackDisplayhInfo | null,
    leagueDirectory: TrackInfoDirectory | null = null
): string {
    const display = leagueDirectory?.track_display?.[trackId];
    if (display) {
        return display
            .replace(/\(.*?\)/g, '')
            .trim()
            .toLowerCase();
    }

    const short = curated?.[trackId]?.short_display;
    if (short) return short.toUpperCase();

    return trackId;
}

export async function getshortTrackName(trackId: string): Promise<string> {
    let displayInfo = await getCuratedTrackDisplayInfo();

    let ret = displayInfo?.[trackId]?.short_display;

    if (!ret) {
        ret = trackId;
    }

    return ret.toUpperCase();
}

export async function getTrackName(trackId: string): Promise<string> {
    let displayInfo = await getCuratedTrackDisplayInfo();

    if (displayInfo && displayInfo[trackId]) {
        return displayInfo[trackId].display;
    }

    return `---- ${trackId}`;
}

// export function guessTrackIdfromEventName(eventName: string): string {
//     let displayInfo = await getCuratedTrackDisplayInfo();
//     let eventNameTokens = eventName.split(' ').map((v) => v.toLowerCase());

//     let trackIdScoresMap: { [name: string]: number } = {};

//     for (let trackId in _longTrackNames) {
//         let currentTrackNameTokens = _longTrackNames[trackId]
//             .split(' ')
//             .map((v) => v.toLowerCase());
//         let score = 0;
//         for (let eventNameToken of eventNameTokens) {
//             if (currentTrackNameTokens.includes(eventNameToken)) {
//                 score++;
//             }
//         }

//         trackIdScoresMap[trackId] = score;
//     }

//     // find the track id for the max score
//     let maxScore = 0;
//     let maxScoreTrackId = '';
//     for (let trackId in trackIdScoresMap) {
//         if (trackIdScoresMap[trackId] > maxScore) {
//             maxScore = trackIdScoresMap[trackId];
//             maxScoreTrackId = trackId;
//         }
//     }

//     return maxScoreTrackId;
// }
