import type {
    M_License,
    M_Member,
    CLTI_Team,
} from 'lplib/endpoint-types/iracing-endpoints';

export function getFirstLastNames(display_name: string): {
    lastName: string;
    firstName: string;
} {
    let nameA = display_name.split(' ');

    let lastName = nameA[nameA.length - 1];

    nameA.pop();
    let firstName = nameA.join(' ');

    return { lastName, firstName };
}

export function getFormulaLicense(licenses: M_License[]): M_License {
    let rL = licenses[0];
    for (let l of licenses) {
        if (l.category === 'formula_car') {
            rL = l;
            break;
        }
    }

    return rL;
}

export function getMemberViewFromM_Member(
    member: M_Member | null,
    _userTeamIdMap: { [name: number]: number },
    _teamInfoMap: { [name: number]: CLTI_Team }
) {
    if (member === null) {
        console.log('[club-debug] getMemberViewFromM_Member: member is null');
        return {
            clubId: -1,
            lastName: '',
            firstName: '',
            iRating: '',
            licenseLevel: '',
            safetyRating: '',
            teamName: '',
            teamId: 0,
        };
    }

    console.log('[club-debug] getMemberViewFromM_Member raw member', {
        cust_id: (member as any).cust_id,
        display_name: (member as any).display_name,
        club_id: (member as any).club_id,
        club_name: (member as any).club_name,
        keys: Object.keys(member as any),
        member,
    });

    let names = getFirstLastNames(member.display_name);
    let rL = getFormulaLicense(member.licenses);
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
    let teamId = _userTeamIdMap[member.cust_id];
    if (teamId) {
        let team = _teamInfoMap[teamId];
        teamName = team.team_name;
    }

    const view = {
        clubId: member.club_id,
        lastName: names.lastName,
        firstName: names.firstName,
        iRating: iratingStr,
        licenseLevel: classLevel,
        safetyRating: rL.safety_rating.toString(),
        teamName: teamName,
        teamId: teamId,
    };

    console.log('[club-debug] getMemberViewFromM_Member returning', {
        cust_id: member.cust_id,
        display_name: member.display_name,
        clubId: view.clubId,
        clubIdType: typeof view.clubId,
    });

    return view;
}
