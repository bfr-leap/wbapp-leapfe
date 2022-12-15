import type {
    MembersData,
    M_License,
    SeasonSimsessionIndex,
    CuratedLeagueTeamsInfo,
    CLTI_Team,
    DriverStatsMap,
    DriverStats,
    M_Member,
    LeagueSeasons,
} from './iracing-endpoints';

const INCLUDE_IDS = false;

async function fetchObjects(urls: string[]): Promise<any[]> {
    let objs = await Promise.all(
        (
            await Promise.all(urls.map((url) => fetch(url)))
        ).map((response) => response.json())
    );

    return objs;
}

export class DriverProfile {
    private _teamsInfo: CuratedLeagueTeamsInfo | null = null;
    private _driverStatsMap: { [name: number]: DriverStatsMap } | null = null;

    public constructor(leagueId: string, custId: string) {
        let element = document.createElement('div');
        element.className = 'card-container';
        element.innerHTML = `<div class='card-item' id="driver-title-card"></div><div class='card-item' id="driver-seasons-card"></div>`;
        document.body.appendChild(element);

        (async () => {
            let [
                driverStatsMap,
                leagueTeamsInfo,
                singleMemberData,
                leagueSeasons,
            ] = <
                [
                    { [name: number]: DriverStatsMap },
                    CuratedLeagueTeamsInfo,
                    M_Member,
                    LeagueSeasons
                ]
            >await fetchObjects([
                `./data/derived/leagueDriverStats_${leagueId}.json`,
                `./data/curated/leagueTeamsInfo_${leagueId}.json`,
                `./data/derived/singleMemberData_${custId}.json`,
                `./data/scraped/leagueSeasons_${leagueId}.json`,
            ]);

            this._driverStatsMap = driverStatsMap;
            this._teamsInfo = leagueTeamsInfo;
            this.renderTitle(singleMemberData, leagueTeamsInfo);

            this.renderSeasons(Number.parseInt(custId), leagueSeasons);
        })();
    }

    private renderSeasons(custId: number, leagueSeasons: LeagueSeasons) {
        let parentDiv = document.getElementById('driver-seasons-card');

        for (let season of leagueSeasons.seasons) {
            let seasonId = season.season_id;
            let m = this._driverStatsMap[seasonId];
            if (!m) {
                continue;
            }

            let stats = m[custId];

            if (!stats) {
                continue;
            }

            this.renderStats(
                parentDiv,
                stats,
                season.season_name,
                season.season_id
            );
        }

        let m = this._driverStatsMap[0];
        if (!m) {
            return;
        }

        let stats = m[custId];

        if (!stats) {
            return;
        }

        this.renderStats(parentDiv, stats, 'All Time');
    }

    private renderStats(
        parentDiv: HTMLElement,
        stats: DriverStats,
        seasonName: string,
        seasonId: number = 0
    ) {
        let newNode = document.createElement('div');
        let seasonTag = seasonId === 0 ? 'span' : 'a';
        let optionalHref =
            seasonId === 0 ? '' : ` href="?&m=user-index&season=${seasonId}"`;
        newNode.className = 'linkbtn-item';
        newNode.innerHTML = `
                    <div class='linkbtn-item linkbtn-fullrow'><${seasonTag}${optionalHref}>${seasonName}</${seasonTag}></div>
                    <div class='driver-stat'><span class='name'>Starts:</span><span class='value'> ${stats.started}</span></div>
                    <div class='driver-stat'><span class='name'>Poles:</span><span class='value'> ${stats.poles}</span></div>
                    <div class='driver-stat'><span class='name'>Wins:</span><span class='value'> ${stats.wins}</span></div>
                    <div class='driver-stat'><span class='name'>Podiums:</span><span class='value'> ${stats.podiums}</span></div>
                    <div class='driver-stat'><span class='name'>Top 10:</span><span class='value'> ${stats.top_10}</span></div>
                    <div class='driver-stat'><span class='name'>Top 20:</span><span class='value'> ${stats.top_20}</span></div>
                    <div class='driver-stat'><span class='name'>Power Points:</span><span class='value'> ${stats.power_points}</span></div>
                    <div class='linkbtn-item linkbtn-fullrow'></div>`;

        // todo:
        // finished: number;
        // fast_laps: number;
        // hard_charger: number;
        parentDiv.appendChild(newNode);
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

        let teamName = '';

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
