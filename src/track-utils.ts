import { getActiveLeagueSchedule, getTrackInfoDirectory } from './fetch-util';

const _trackNames: { [name: string]: string } = {
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
    '390': 'Hock',
    '403': 'RBR',
    '413': 'Hung',
    '434': 'Watk',
    '448': 'INDY',
};

export function getshortTrackName(trackId: string): string {
    let ret = _trackNames[trackId];

    if (!ret) {
        ret = trackId;
    }

    return ret.toUpperCase();
}

export async function getTrackName(trackId: string): Promise<string> {
    let leagues = (await getActiveLeagueSchedule()).leagues.map(
        (l) => l.league_id
    );

    for (let l of leagues) {
        let tInfo = await getTrackInfoDirectory(l.toString());
        let name = tInfo.track_display[trackId];
        if (name) {
            return name;
        }
    }

    return `----`;
}
