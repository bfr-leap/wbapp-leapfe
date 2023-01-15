import { getLeagueSimsessionIndex } from './fetch-util';

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

    let seasonSimsessionIndex = await getLeagueSimsessionIndex(leagueId);

    for (let seasonIt of seasonSimsessionIndex) {
        for (let sIt of seasonIt.sessions) {
            if (sIt?.subsession_id.toString() || '' === subsessionId) {
                _subsessionNames[k] = ret = sIt.session_title;
                return ret;
            }
        }
    }

    return '-' + subsessionId;
}
