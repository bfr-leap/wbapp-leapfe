import type { DropdownModel } from '@/models/dropdown-model';
import { getDefaultDropdownModel } from '@/models/dropdown-model';
import {
    getCuratedBlockedSeasons,
    getLeagueSimsessionIndex,
    getCuratedActiveLeagueSchedule,
} from '@/fetch-util';
import type { SeasonSimsessionIndex } from '../iracing-endpoints';

export interface LeagueIndexModel {
    leagueOptions: DropdownModel;
    seasonOptions: DropdownModel;
    subsessionOptions: DropdownModel;
    simsessionOptions: DropdownModel;
}

export function getDefaultLeagueIndexModel(): LeagueIndexModel {
    return JSON.parse(
        JSON.stringify({
            leagueOptions: getDefaultDropdownModel(),
            seasonOptions: getDefaultDropdownModel(),
            subsessionOptions: getDefaultDropdownModel(),
            simsessionOptions: getDefaultDropdownModel(),
        })
    );
}

export async function getLeagueIndexModel(
    leagueId: string,
    seasonId: string,
    subsessionId: string,
    simsessionId: string
): Promise<LeagueIndexModel> {
    let leagueSchedule = await getCuratedActiveLeagueSchedule();
    let blockedSeasons = await getCuratedBlockedSeasons();

    let seasonSimsessionIndex: SeasonSimsessionIndex[] = (
        await getLeagueSimsessionIndex(leagueId)
    ).sort((a, b) => b.season_id - a.season_id);

    let selectedLeague = leagueSchedule.leagues.find(
        (l) => l.league_id.toString() === leagueId
    );

    let selectedSeason = seasonSimsessionIndex.find(
        (s) => s.season_id.toString() === seasonId
    );

    let selectedSubsession = selectedSeason?.sessions.find(
        (s) => s.subsession_id.toString() === subsessionId
    );

    let selectedSimsession = selectedSubsession?.simsessions.find(
        (s) => s.simsession_id.toString() === simsessionId
    );

    let ret: LeagueIndexModel = getDefaultLeagueIndexModel();

    ret.leagueOptions.selected = selectedLeague?.name || '---';

    ret.seasonOptions.selected = selectedSeason?.season_title || '---';

    ret.subsessionOptions.selected = selectedSubsession?.session_title || '---';

    ret.simsessionOptions.selected = selectedSimsession?.type || '---';

    ret.leagueOptions.options = [];
    ret.seasonOptions.options = [];

    ret.subsessionOptions.options = [];

    ret.simsessionOptions.options = [];

    if (
        !selectedLeague ||
        !selectedSimsession ||
        !selectedSubsession ||
        !selectedSeason
    ) {
        return ret;
    }

    for (let leagueIt of leagueSchedule.leagues) {
        ret.leagueOptions.options.push({
            display: leagueIt.name,
            href: `?m=results&league=${leagueIt.league_id}`,
        });
    }

    for (let seasonIt of seasonSimsessionIndex) {
        if (
            !blockedSeasons[`${leagueId}_${seasonIt.season_id}`] &&
            seasonIt.sessions.length > 0
        ) {
            ret.seasonOptions.options.push({
                display: seasonIt.season_title,
                href: `?m=results&league=${leagueId}&season=${seasonIt.season_id}&subsession=${seasonIt.sessions[0]?.subsession_id}&simsession=${seasonIt.sessions[0]?.simsessions[0]?.simsession_id}`,
            });
        }
    }

    for (let subsessionIt of selectedSeason.sessions) {
        ret.subsessionOptions.options.push({
            display: subsessionIt.session_title,
            href: `?m=results&league=${leagueId}&season=${selectedSeason.season_id}&subsession=${subsessionIt.subsession_id}&simsession=${subsessionIt.simsessions[0]?.simsession_id}`,
        });
    }

    for (let simsessionIt of selectedSubsession.simsessions) {
        if (
            simsessionIt.type === 'race' ||
            simsessionIt.type === 'sprint' ||
            simsessionIt.type === 'qualify'
        )
            ret.simsessionOptions.options.push({
                display: simsessionIt.type,
                href: `?m=results&league=${leagueId}&season=${selectedSeason.season_id}&subsession=${selectedSubsession.subsession_id}&simsession=${simsessionIt.simsession_id}`,
            });
    }

    return ret;
}
