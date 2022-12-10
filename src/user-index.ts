import type { MembersData, M_License } from './iracing-endpoints';

export class UserIndex {
    constructor(league: string) {
        let element = document.createElement('div');
        element.className = 'card-container';
        element.innerHTML = `<div class='card-item' id="user-index-card"></div>`;
        document.body.appendChild(element);

        fetch(`./data/scraped/membersData_${league}.json`)
            .then((response) => {
                return response.json();
            })
            .then((jsondata: MembersData) => {
                console.log(jsondata);

                this.renderIndex(jsondata);
            });
    }

    private getRoadLicense(licenses: M_License[]): M_License {
        let rL = licenses[0];
        for (let l of licenses) {
            if (l.category === 'road') {
                rL = l;
                break;
            }
        }

        return rL;
    }

    private renderIndex(index: MembersData) {
        let indexCard = document.getElementById('user-index-card');
        for (let mem of index.members) {
            let sesName = document.createElement('div');
            sesName.className = 'linkbtn-item linkbtn-fullrow';

            let rL = this.getRoadLicense(mem.licenses);

            sesName.innerHTML = `${mem.display_name} :: ${rL.irating} :: ${rL.group_name} ${rL.safety_rating}`;
            indexCard.appendChild(sesName);
        }
    }
}
