import { M_Member } from '../../src/iracing-endpoints.js';
import {
    getLeagueSeasons,
    getMembersData,
} from '../iracing-scraped-data-loader.js';
import { wf } from './file-writer.js';

export function deriveSingleMemberInfo(leagueId: number) {
    let leagueSeasons = getLeagueSeasons(leagueId);

    let mMap: { [name: number]: M_Member } = {};

    for (let season of leagueSeasons.seasons) {
        try {
            let membersData = getMembersData(leagueId, season.season_id);
            for (let member of membersData.members) {
                mMap[member.cust_id] = member;
            }
        } catch (e) {
            console.log(
                `can't find member data for: ${season.season_name} ...continuing`
            );
        }
    }

    let allCustIds = Object.keys(mMap);
    for (let custId of allCustIds) {
        wf(mMap[custId], `singleMemberData_${custId}.json`);
    }
}
