import type {
    MembersData,
    M_License,
    SeasonSimsessionIndex,
    CuratedLeagueTeamsInfo,
    CLTI_Team,
    DriverStatsMap,
    DriverStats,
    M_Member,
} from './iracing-endpoints';

const INCLUDE_IDS = false;

export class DriverProfile {
    private _teamsInfo: CuratedLeagueTeamsInfo | null = null;

    public constructor(leagueId: string, custId: string) {
        let element = document.createElement('div');
        element.className = 'card-container';
        element.innerHTML = `<div class='card-item' id="driver-title-card"></div>`;
        document.body.appendChild(element);

        fetch(`./data/derived/leagueDriverStats_${leagueId}.json`)
            .then((response) => {
                return response.json();
            })
            .then((driverStatsMap: DriverStatsMap) => {
                console.log(driverStatsMap);
                fetch(`./data/curated/leagueTeamsInfo_${leagueId}.json`)
                    .then((response) => {
                        return response.json();
                    })
                    .then((leagueTeamsInfo: CuratedLeagueTeamsInfo) => {
                        console.log(leagueTeamsInfo);
                        fetch(`./data/derived/singleMemberData_${custId}.json`)
                            .then((response) => {
                                return response.json();
                            })
                            .then((singleMemberData: M_Member) => {
                                console.log(singleMemberData);
                                this._teamsInfo = leagueTeamsInfo;
                                this.renderTitle(
                                    singleMemberData,
                                    leagueTeamsInfo
                                );
                            });
                    });
            });
    }

    private renderTitle(
        singleMemberData: M_Member,
        teamsInfo: CuratedLeagueTeamsInfo
    ) {
        let mem = singleMemberData;

        let nameA = mem.display_name.split(' ');
        let lastName = nameA[nameA.length - 1] + ' ';
        nameA.pop();
        let firstName = nameA.join(' ');

        let rL = this.getRoadLicense(mem.licenses);
        let classLevel = rL.group_name[rL.group_name.length - 1].toUpperCase();

        let irating = rL.irating;
        if (!irating) {
            irating = 0;
        }

        let iratingStr =
            Math.floor(irating / 1000) +
            '.' +
            Math.floor((irating % 1000) / 100) +
            'k';

        let teamName = 'Privateer';

        let parentDiv = document.getElementById('driver-title-card');

        let memDiv = document.createElement('div');
        parentDiv.appendChild(memDiv);
        memDiv.className = 'linkbtn-item linkbtn-fullrow';

        memDiv.innerHTML = `
        <div class='driver-img club-${mem.club_id}'></div>
        <div class='driver'>
            <span style="display:inline-block"><div><span class='last-name'>${lastName}</span> <span class='firt-name'>${
            INCLUDE_IDS ? firstName + ' ' + mem.cust_id : firstName
        }</span>  <span class='license-pill-${classLevel.toLowerCase()}'>${iratingStr} | ${classLevel} ${
            rL.safety_rating
        }<span></div>
            <div>${teamName}</div></span>
        </div>
        `;
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
}
