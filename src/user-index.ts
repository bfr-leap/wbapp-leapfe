import type {
    MembersData,
    M_License,
    SeasonSimsessionIndex,
} from './iracing-endpoints';

export class UserIndex {
    private membersData: null | MembersData = null;
    private seasonSimsessionIndex: null | SeasonSimsessionIndex = null;
    constructor(league: string, season: string) {
        let element = document.createElement('div');
        element.className = 'card-container';
        element.innerHTML = `<div class='card-item' id="season-title-card"></div>`;
        document.body.appendChild(element);

        element = document.createElement('div');
        element.className = 'card-container';
        element.innerHTML = `<div class='card-item' id="user-index-card"></div>`;
        document.body.appendChild(element);

        fetch(`./data/scraped/membersData_${league}_${season}.json`)
            .then((response) => {
                return response.json();
            })
            .then((jsondata: MembersData) => {
                console.log(jsondata);
                this.renderUserList(jsondata);
            });

        fetch(`./data/derived/leagueSimsessionIndex_${league}.json`)
            .then((response) => {
                return response.json();
            })
            .then((jsondata: SeasonSimsessionIndex[]) => {
                console.log(jsondata);
                this.renderHeader(jsondata, Number.parseInt(season, 10));
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

    private renderHeader(
        seasonIndex: SeasonSimsessionIndex[],
        seasonId: number
    ) {
        let titleCard = document.getElementById('season-title-card');

        let season = seasonIndex.find((s) => s.season_id === seasonId);
        if (undefined === season) {
            return;
        }

        let tableHeader = document.createElement('div');
        tableHeader.className = 'linkbtn-item linkbtn-fullrow';
        tableHeader.innerHTML = `${season.season_title}`;
        titleCard.appendChild(tableHeader);
    }

    private renderUserList(index: MembersData) {
        let indexCard = document.getElementById('user-index-card');

        let tableHeader = document.createElement('div');
        tableHeader.className = 'linkbtn-item linkbtn-fullrow';
        tableHeader.innerHTML = `
        <div class='p-ranking-header'>Power Ranking</div>
        <div class='p-points-header'>Power Points</div>
        <div class='driver-img-header'></div>
        <div class='driver-header'>Driver</div>
        `;
        indexCard.appendChild(tableHeader);

        let powerRanking = 1;

        let members = index.members.sort(
            (a, b) =>
                (this.getRoadLicense(b.licenses).irating | 0) -
                (this.getRoadLicense(a.licenses).irating | 0)
        );

        for (let mem of members) {
            let sesName = document.createElement('div');
            sesName.className = 'linkbtn-item linkbtn-fullrow';

            let rL = this.getRoadLicense(mem.licenses);

            let nameA = mem.display_name.split(' ');

            let lastName = nameA[nameA.length - 1] + ' ';

            nameA.pop();
            let firstName = nameA.join(' ');

            let classLevel =
                rL.group_name[rL.group_name.length - 1].toUpperCase();

            let irating = rL.irating;
            if (!irating) {
                irating = 0;
            }

            let iratingStr =
                Math.floor(irating / 1000) +
                '.' +
                Math.floor((irating % 1000) / 100) +
                'k';

            sesName.innerHTML = `
            <div class='p-ranking'><span>${powerRanking}<span></div>
            <div class='p-points'>${irating}</div>
            <div class='driver-img club-${mem.club_id}'></div>
            <div class='driver'>
                <span style="display:inline-block"><div><span class='last-name'>${lastName}</span> <span class='firt-name'>${firstName}</span>  <span class='license-pill-${classLevel.toLowerCase()}'>${iratingStr} | ${classLevel} ${
                rL.safety_rating
            }<span></div>
                <div>Team Name</div></span>
            </div>
            `;
            indexCard.appendChild(sesName);

            sesName = document.createElement('div');
            sesName.className = 'linkbtn-item more-detail-btn';
            sesName.innerHTML = '&#x25BC;';
            indexCard.appendChild(sesName);

            sesName.onclick = () => {
                let newParent = document.createElement('span');

                let newNode = document.createElement('div');
                newNode.className = 'linkbtn-item';
                newNode.innerHTML = 'Comming Soon!';
                newParent.appendChild(newNode);

                newNode = document.createElement('div');
                newNode.className = 'linkbtn-item more-detail-btn';
                newNode.innerHTML = '&#x25B2;';
                newParent.appendChild(newNode);

                indexCard.replaceChild(newParent, sesName);

                newNode.onclick = () => {
                    indexCard.replaceChild(sesName, newParent);
                };
            };

            ++powerRanking;
        }
    }
}
