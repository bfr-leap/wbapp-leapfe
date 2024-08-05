import {
    getLeagueSeasons,
    getCuratedBlockedSeasons,
    getCuratedActiveLeagueSchedule,
    getUserLeaguesState,
} from '@@/src/utils/fetch-util';
import type { DropdownModel } from '@@/src/models/dropdown-model';
import { getDefaultDropdownModel } from '@@/src/models/dropdown-model';

export interface LeagueSeasonMenuModel {
    leagueOptions: DropdownModel;
    seasonOptions: DropdownModel;
}

export function getDefaultLeagueSeasonMenuModel(): LeagueSeasonMenuModel {
    return JSON.parse(
        JSON.stringify({
            leagueOptions: getDefaultDropdownModel(),
            seasonOptions: getDefaultDropdownModel(),
        })
    );
}

export async function getLeagueSeasonMenuModel(
    league: string,
    season: string,
    targetPage: string,
    isSignedIn: boolean
): Promise<LeagueSeasonMenuModel> {
    let ret = getDefaultLeagueSeasonMenuModel();

    if (!league || '0' === league || !season || '0' === season) {
        return ret;
    }

    let leagueSchedule = await getCuratedActiveLeagueSchedule();
    let blockedSeasons = await getCuratedBlockedSeasons();
    let leagueSeasons = await getLeagueSeasons(league);
    leagueSeasons?.seasons.sort((a, b) => b.season_id - a.season_id);

    let currentSeason = leagueSeasons?.seasons.find(
        (s) => s.season_id.toString() === season
    );

    let minSeasonId = <number>(<unknown>blockedSeasons?.['min_season_id']) || 0;

    leagueSeasons?.seasons.sort((a, b) => b.season_id - a.season_id);

    ret.seasonOptions.selected = currentSeason?.season_name || '---';

    ret.seasonOptions.options = [];
    for (let season of leagueSeasons?.seasons || []) {
        if (
            !blockedSeasons?.[`${league}_${season.season_id}`] &&
            season.season_id > minSeasonId
        ) {
            ret.seasonOptions.options.push({
                display: season.season_name,
                href: `?m=${targetPage}&league=${league}&season=${season.season_id}`,
            });
        }
    }

    ret.leagueOptions.selected =
        leagueSchedule?.leagues.find((v) => v.league_id.toString() === league)
            ?.name || '---';

    ret.leagueOptions.options = [];
    let leagues = leagueSchedule?.leagues || [];

    if (isSignedIn) {
        let userLeaguesState = await getUserLeaguesState();

        if (userLeaguesState.length !== 0) {
            if (leagueSchedule) {
                leagues = leagues.filter(
                    (l) =>
                        userLeaguesState.findIndex(
                            (ls) => ls.league_id === l.league_id
                        ) >= 0
                );
            }
        }
    }

    for (let league of leagues) {
        ret.leagueOptions.options.push({
            display: league.name,
            href: `?m=${targetPage}&league=${league.league_id}`,
        });
    }

    return ret;
}
