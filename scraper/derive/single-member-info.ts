/**
 *
 * This code defines a TypeScript module that exports a function called deriveSingleMemberInfo, which takes
 * a leagueId as input. It utilizes imported functions from other modules to retrieve league seasons and
 * member data for each season associated with the given leagueId. It then creates a mapping of member
 * information using the member's custom ID and writes individual JSON files containing the data of each
 * member using the wf function from the file-writer.js module. If an error occurs while fetching member
 * data for a particular season, a corresponding error message is logged.
 *
 */

import { M_Member } from '../../src/iracing-endpoints.js';
import {
    getLeagueSeasons,
    getMembersData,
} from '../iracing/iracing-scraped-data-loader.js';
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
