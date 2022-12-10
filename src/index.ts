import { CumulativeChart } from './cumulative-delta-chart';
import { LeagueIndex } from './league-index';
import { UserIndex } from './user-index';

function getUrlVars(): { [name: string]: string } {
    let vars: { [name: string]: string } = {};

    let hashes = window.location.href
        .slice(window.location.href.indexOf('?') + 1)
        .split('&');
    for (let i = 0; i < hashes.length; i++) {
        let hash = hashes[i].split('=');
        if (hash[1]) {
            vars[hash[0]] = hash[1];
        }
    }
    return vars;
}

let pageElements: any[] = [];

function main() {
    if (document.readyState !== 'complete') {
        return;
    }
    let urlVars = getUrlVars();

    let subsession = urlVars['subsession'] || '58009723';
    let simsession = urlVars['simsession'] || '-3';
    let league: string = urlVars['league'] || '6555';
    let mode: string = urlVars['m'] || 'cumulative-chart';

    switch (mode) {
        case 'user-index':
            pageElements.push(new UserIndex(league));
            break;
        case 'cumulative-chart':
        default:
            pageElements.push(new CumulativeChart(subsession, simsession));
            pageElements.push(new LeagueIndex(league));
    }
}

document.onreadystatechange = main;
