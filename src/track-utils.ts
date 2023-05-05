import {
    getCuratedActiveLeagueSchedule,
    getTrackInfoDirectory,
} from './fetch-util';

const _trackNames: { [name: string]: string } = {
    '18': 'RA',
    '108': 'Watk', // retired
    '127': 'Atl',
    '149': 'Zand',
    '163': 'SPA',
    '166': 'Okay',
    '168': 'Suzu',
    '179': 'Long',
    '195': 'Twin',
    '212': 'INTR',
    '218': 'Gill',
    '229': 'COTA',
    '239': 'MONZ',
    '250': 'Nürb',
    '266': 'IMOL',
    '341': 'Silv',
    '345': 'Cata',
    '349': 'Cata',
    '390': 'Hock',
    '403': 'RBR',
    '413': 'Hung',
    '434': 'Watk',
    '448': 'INDY',
};

const _longTrackNames: { [name: string]: string } = {
    '18': 'Road America',
    '108': '[Retired] Watkins Glen International',
    '127': 'Road Atlanta',
    '149': 'Circuit Park Zandvoort',
    '163': 'Circuit de Spa-Francorchamps',
    '166': 'Okayama International Circuit',
    '168': 'Suzuka International Racing Course',
    '179': 'Long Beach Street Circuit',
    '195': 'Twin Ring Motegi',
    '212': 'Autódromo José Carlos Pace',
    '218': 'Circuit Gilles Villeneuve',
    '229': 'Circuit of the Americas',
    '239': 'Autodromo Nazionale Monza',
    '250': 'Nürburgring Grand-Prix-Strecke',
    '266': 'Autodromo Internazionale Enzo e Dino Ferrari',
    '341': 'Silverstone Circuit',
    '345': 'Circuit de Barcelona Catalunya',
    '349': 'Circuit de Barcelona Catalunya',
    '390': 'Hockenheimring Baden-Württemberg',
    '403': 'Red Bull Ring',
    '413': 'Hungaroring',
    '434': 'Watkins Glen International',
    '448': 'Indianapolis Motor Speedway',
};

export function getshortTrackName(trackId: string): string {
    let ret = _trackNames[trackId];

    if (!ret) {
        ret = trackId;
    }

    return ret.toUpperCase();
}

export async function getTrackName(trackId: string): Promise<string> {
    if (_longTrackNames[trackId]) {
        return _longTrackNames[trackId];
    }

    return `---- ${trackId}`;
}

export function guessTrackIdfromEventName(eventName: string): string {
    let eventNameTokens = eventName.split(' ').map((v) => v.toLowerCase());

    let trackIdScoresMap: { [name: string]: number } = {};

    for (let trackId in _longTrackNames) {
        let currentTrackNameTokens = _longTrackNames[trackId]
            .split(' ')
            .map((v) => v.toLowerCase());
        let score = 0;
        for (let eventNameToken of eventNameTokens) {
            if (currentTrackNameTokens.includes(eventNameToken)) {
                score++;
            }
        }

        trackIdScoresMap[trackId] = score;
    }

    // find the track id for the max score
    let maxScore = 0;
    let maxScoreTrackId = '';
    for (let trackId in trackIdScoresMap) {
        if (trackIdScoresMap[trackId] > maxScore) {
            maxScore = trackIdScoresMap[trackId];
            maxScoreTrackId = trackId;
        }
    }

    return maxScoreTrackId;
}
