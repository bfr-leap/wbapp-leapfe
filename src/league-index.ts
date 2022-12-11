import type { SeasonSimsessionIndex } from './iracing-endpoints';

export class LeagueIndex {
    constructor(league: string) {
        let element = document.createElement('div');
        element.className = 'card-container';
        element.innerHTML = `<div class='card-item' id="index-card"></div>`;
        document.body.appendChild(element);

        fetch(`./data/derived/leagueSimsessionIndex_${league}.json`)
            .then((response) => {
                return response.json();
            })
            .then((jsondata: SeasonSimsessionIndex[]) => {
                console.log(jsondata);

                this.renderIndex(jsondata);
            });
    }

    private renderIndex(index: SeasonSimsessionIndex[]) {
        let indexCard = document.getElementById('index-card');
        for (let idx of index) {
            let seasonName = document.createElement('div');
            seasonName.className = 'linkbtn-item linkbtn-fullrow';
            seasonName.innerHTML = idx.season_title;
            indexCard.appendChild(seasonName);
            for (let ses of idx.sessions) {
                let sesName = document.createElement('div');
                sesName.className = 'linkbtn-item linkbtn-fullrow';
                sesName.innerHTML = ' :: ' + ses.session_title;
                indexCard.appendChild(sesName);
                for (let sim of ses.simsessions) {
                    if (sim.type === 'race' || sim.type === 'sprint') {
                        let simLink = document.createElement('a');
                        simLink.innerHTML = sim.type;
                        simLink.className = 'linkbtn-inline-item';
                        simLink.href = `index.html?&m=cumulative-chart&subsession=${ses.subsession_id}&simsession=${sim.simsession_id}`;
                        sesName.appendChild(simLink);
                    }
                }
            }
        }
    }
}
