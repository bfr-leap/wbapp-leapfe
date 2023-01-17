import { getLeagueSimsessionIndex } from './fetch-util';
import type { SeasonSimsessionIndex } from './iracing-endpoints';

const _subsessionNames: { [name: string]: string } = {};
export async function getSubsessionName(
    leagueId: string,
    subsessionId: string
): Promise<string> {
    let k = `${leagueId}_${subsessionId}`;
    let ret = _subsessionNames[k];

    if (ret) {
        return ret;
    }

    let seasonSimsessionIndex: SeasonSimsessionIndex[] =
        await getLeagueSimsessionIndex(leagueId);

    seasonSimsessionIndex.sort((a, b) => a.season_id - b.season_id);

    for (let seasonIt of seasonSimsessionIndex) {
        seasonIt.sessions.sort((a, b) => a.subsession_id - b.subsession_id);

        for (let sIt of seasonIt.sessions) {
            _subsessionNames[`${leagueId}_${sIt.subsession_id}`] =
                sIt.session_title;
        }
    }

    ret = _subsessionNames[k];

    if (ret) {
        return ret;
    }

    return '-' + subsessionId;
}

const _subsessionNamesShort: { [name: string]: string } = {};
export async function getShortSubsessionName(
    leagueId: string,
    subsessionId: string
): Promise<string> {
    let k = `${leagueId}_${subsessionId}`;
    let ret = _subsessionNamesShort[k];

    if (ret) {
        return ret;
    }

    let seasonSimsessionIndex = await getLeagueSimsessionIndex(leagueId);

    seasonSimsessionIndex.sort((a, b) => a.season_id - b.season_id);

    for (let seasonIt of seasonSimsessionIndex) {
        seasonIt.sessions.sort((a, b) => a.subsession_id - b.subsession_id);

        let r = 1;

        for (let sIt of seasonIt.sessions) {
            _subsessionNamesShort[
                `${leagueId}_${sIt.subsession_id}`
            ] = `R:${r}`;
            ++r;
        }
    }

    ret = _subsessionNamesShort[k];

    if (ret) {
        return ret;
    }

    return '-' + subsessionId;
}
