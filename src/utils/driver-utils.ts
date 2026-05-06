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

// iRacing replaced the regional `club_id` with a country-level `flair`
// on the league membersData endpoint. The UI still keys flag CSS off
// the legacy regional clubs, so map the country flair shortname back
// to the closest iRacing region. Unknown countries fall through to
// club 1 (International).
const FLAIR_TO_CLUB: { [shortname: string]: number } = {
    USA: 30,
    CAN: 15,
    GBR: 36,
    SCT: 36,
    WLS: 36,
    ENG: 36,
    NIR: 36,
    IRL: 36,
    FRA: 39,
    DEU: 42,
    GER: 42,
    ITA: 41,
    ESP: 38,
    PRT: 38,
    POR: 38,
    FIN: 44,
    SWE: 43,
    NOR: 43,
    DNK: 43,
    DEN: 43,
    ISL: 43,
    NLD: 40,
    NED: 40,
    BEL: 40,
    LUX: 40,
    AUS: 34,
    NZL: 34,
    JPN: 48,
    BRA: 45,
    ZAF: 50,
    MEX: 24,
    COL: 24,
    ARG: 24,
    CHL: 24,
    PER: 24,
    VEN: 24,
    URY: 24,
    BOL: 24,
    PRY: 24,
    ECU: 24,
    CRI: 24,
    PAN: 24,
    GTM: 24,
    DOM: 24,
    PRI: 24,
    CHN: 47,
    KOR: 47,
    IND: 47,
    LKA: 47,
    THA: 47,
    SGP: 47,
    MYS: 47,
    IDN: 47,
    PHL: 47,
    HKG: 47,
    TWN: 47,
    VNM: 47,
    ARE: 47,
    SAU: 47,
    ISR: 47,
    AUT: 46,
    CHE: 46,
    POL: 46,
    CZE: 46,
    HUN: 46,
    ROU: 46,
    GRC: 46,
    TUR: 46,
    RUS: 46,
    UKR: 46,
    BGR: 46,
    HRV: 46,
    SRB: 46,
    SVK: 46,
    SVN: 46,
    LTU: 46,
    LVA: 46,
    EST: 46,
    BIH: 46,
    MKD: 46,
    ALB: 46,
    MNE: 46,
    BLR: 46,
    MLT: 46,
    CYP: 46,
};

export function resolveClubId(member: M_Member): number {
    if (typeof member.club_id === 'number') {
        return member.club_id;
    }
    const code = member.flair_shortname?.toUpperCase();
    if (code && code in FLAIR_TO_CLUB) {
        return FLAIR_TO_CLUB[code];
    }
    return 1;
}

export function getMemberViewFromM_Member(
    member: M_Member | null,
    _userTeamIdMap: { [name: number]: number },
    _teamInfoMap: { [name: number]: CLTI_Team }
) {
    if (member === null) {
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

    return {
        clubId: resolveClubId(member),
        lastName: names.lastName,
        firstName: names.firstName,
        iRating: iratingStr,
        licenseLevel: classLevel,
        safetyRating: rL.safety_rating.toString(),
        teamName: teamName,
        teamId: teamId,
    };
}
