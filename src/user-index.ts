import type {
    MembersData,
    M_License,
    SeasonSimsessionIndex,
    CuratedLeagueTeamsInfo,
    CLTI_Team,
    DriverStatsMap,
    DriverStats,
} from './iracing-endpoints';

const INCLUDE_IDS = false;

export class UserIndex {
    private _teamInfoMap: { [name: number]: CLTI_Team } = {};
    private _userTeamIdMap: { [name: number]: number } = {};
    private _leagueDriverStats: { [name: number]: DriverStatsMap } = {};
    private _seasonId: number = 0;
    constructor(league: string, season: string) {
        this._seasonId = Number.parseInt(season, 10);

        let element = document.createElement('div');
        element.className = 'card-container';
        element.innerHTML = `<div class='card-item' id="season-title-card"></div>`;
        document.body.appendChild(element);

        element = document.createElement('div');
        element.className = 'card-container';
        element.innerHTML = `<div class='card-item' id="user-index-card"></div>`;
        document.body.appendChild(element);

        fetch(`./data/derived/leagueDriverStats_${league}.json`)
            .then((response) => {
                return response.json();
            })
            .then((leagueDriverStats: { [name: number]: DriverStatsMap }) => {
                console.log(leagueDriverStats);
                this._leagueDriverStats = leagueDriverStats;
                fetch(`./data/curated/leagueTeamsInfo_${league}.json`)
                    .then((response) => {
                        return response.json();
                    })
                    .then((leagueTeamsInfo: CuratedLeagueTeamsInfo) => {
                        console.log(leagueTeamsInfo);
                        this.populateTeamInfoMaps(
                            leagueTeamsInfo,
                            Number.parseInt(season, 10)
                        );
                        fetch(
                            `./data/scraped/membersData_${league}_${season}.json`
                        )
                            .then((response) => {
                                return response.json();
                            })
                            .then((memberData: MembersData) => {
                                console.log(memberData);
                                this.renderUserList(memberData);
                            });
                    });
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

    private populateTeamInfoMaps(
        leagueTeamsInfo: CuratedLeagueTeamsInfo,
        seasonId: number
    ) {
        let season = leagueTeamsInfo.seasons.find(
            (s) => s.season_id === seasonId
        );
        if (!season) {
            return;
        }

        for (let team of season.teams) {
            this._teamInfoMap[team.team_id] = team;
            for (let member of team.team_members) {
                this._userTeamIdMap[member] = team.team_id;
            }
        }
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
        tableHeader.innerHTML = `${
            INCLUDE_IDS
                ? season.season_title + ' ' + season.season_id
                : season.season_title
        }`;
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

        let members = index.members.sort((a, b) =>
            this._leagueDriverStats[this._seasonId][b.cust_id].power_points !==
            this._leagueDriverStats[this._seasonId][a.cust_id].power_points
                ? this._leagueDriverStats[this._seasonId][b.cust_id]
                      .power_points -
                  this._leagueDriverStats[this._seasonId][a.cust_id]
                      .power_points
                : (this.getRoadLicense(b.licenses).irating | 0) -
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

            let powerPoints =
                this._leagueDriverStats[this._seasonId][mem.cust_id]
                    .power_points;

            let teamName = 'Privateer';
            let teamId = this._userTeamIdMap[mem.cust_id];
            if (teamId) {
                let team = this._teamInfoMap[teamId];
                teamName = team.team_name;
            }

            sesName.innerHTML = `
            <div class='p-ranking'><span>${powerRanking}<span></div>
            <div class='p-points'>${powerPoints}</div>
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
            indexCard.appendChild(sesName);

            sesName = document.createElement('div');
            sesName.className = 'linkbtn-item more-detail-btn';
            sesName.innerHTML = '&#x25BC;';
            indexCard.appendChild(sesName);

            sesName.onclick = () => {
                let newParent = document.createElement('span');

                let stats =
                    this._leagueDriverStats[this._seasonId][mem.cust_id];

                if (stats) {
                    let newNode = document.createElement('div');
                    newNode.className = 'linkbtn-item';
                    newNode.innerHTML = `
                    <div class='driver-stat'><span class='name'>Starts:</span><span class='value'> ${stats.started}</span></div>
                    <div class='driver-stat'><span class='name'>Poles:</span><span class='value'> ${stats.poles}</span></div>
                    <div class='driver-stat'><span class='name'>Wins:</span><span class='value'> ${stats.wins}</span></div>
                    <div class='driver-stat'><span class='name'>Podiums:</span><span class='value'> ${stats.podiums}</span></div>
                    <div class='driver-stat'><span class='name'>Top 10:</span><span class='value'> ${stats.top_10}</span></div>
                    <div class='driver-stat'><span class='name'>Top 20:</span><span class='value'> ${stats.top_20}</span></div>`;

                    // todo:
                    // finished: number;
                    // fast_laps: number;
                    // hard_charger: number;
                    // power_points: number;
                    newParent.appendChild(newNode);
                }

                let newNode = document.createElement('div');
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
