import {
    getLeagueSeasons,
    getCuratedBlockedSeasons,
    getCuratedActiveLeagueSchedule,
    getUserLeaguesState
} from '@/utils/fetch-util';
import type { DropdownModel } from '@/models/dropdown-model';
import { getDefaultDropdownModel } from '@/models/dropdown-model';
import { useAuth } from 'vue-clerk';

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
    targetPage: string
): Promise<LeagueSeasonMenuModel> {
    let ret = getDefaultLeagueSeasonMenuModel();

    let signedIn = false;

    try {
        const { isSignedIn } = useAuth();
        signedIn = isSignedIn.value === true;
    } catch (e) { }

    if (!league || '0' === league) {
        return ret;
    }

    let leagueSchedule = await getCuratedActiveLeagueSchedule();
    let blockedSeasons = await getCuratedBlockedSeasons();

    if (signedIn) {
        let userLeaguesState = await getUserLeaguesState();

        if (userLeaguesState.length === 0) {
            return ret;
        }

        if (leagueSchedule) {
            leagueSchedule.leagues = leagueSchedule.leagues.filter(
                l => userLeaguesState.findIndex(ls => ls.leagueID === l.league_id) >= 0);
        }

        if (userLeaguesState.findIndex(ls => ls.leagueID.toString() === league) < 0) {
            league = userLeaguesState[0].leagueID.toString();
        }
    }

    let leagueSeasons = await getLeagueSeasons(league);
    leagueSeasons?.seasons.sort((a, b) => b.season_id - a.season_id);

    let pSeason = season;
    if (!pSeason) {
        pSeason = leagueSeasons?.seasons[0].season_id.toString() || '';
    }

    let currentSeason = leagueSeasons?.seasons.find(
        (s) => s.season_id.toString() === pSeason
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
    for (let league of leagueSchedule?.leagues || []) {
        ret.leagueOptions.options.push({
            display: league.name,
            href: `?m=${targetPage}&league=${league.league_id}`,
        });
    }

    return ret;
}
