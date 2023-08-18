import { getCuratedTrackDisplayInfo } from './fetch-util';

export async function getshortTrackName(trackId: string): Promise<string> {
    let displayInfo = await getCuratedTrackDisplayInfo();

    let ret = displayInfo[trackId]?.short_display;

    if (!ret) {
        ret = trackId;
    }

    return ret.toUpperCase();
}

export async function getTrackName(trackId: string): Promise<string> {
    let displayInfo = await getCuratedTrackDisplayInfo();

    if (displayInfo[trackId]) {
        return displayInfo[trackId].long_display;
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
