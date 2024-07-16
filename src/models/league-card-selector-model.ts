import { getUserLeaguesState, setUserLeaguesState } from '@/utils/fetch-util';
import type { UserLeaguesState } from 'lplib/endpoint-types/usrdata';

type LeagueCardSelectorModel = {
    isActive: boolean;
    name: string;
    leagueID: number;
}[];

export function getDefaultLeagueCardSelectorModel(): LeagueCardSelectorModel {
    return JSON.parse(
        JSON.stringify([
            { isActive: false, name: 'iGP', leagueID: 637 },
            { isActive: false, name: 'iFL', leagueID: 6555 },
            { isActive: false, name: 'J2iCS', leagueID: 3630 },
            { isActive: false, name: 'LZ', leagueID: 4534 },
        ])
    );
}

const _knownLeagues = [
    { id: 6555, name: 'iFormula League' },
    { id: 637, name: 'iGP Fun' },
    { id: 4534, name: 'League Zero' },
    { id: 3630, name: 'J2iCS' },
].sort((a, b) => (a.name.toUpperCase() < b.name.toUpperCase() ? -1 : 1));

async function convertUserLeaguesState(
    state: UserLeaguesState
): Promise<LeagueCardSelectorModel> {
    return await _knownLeagues.map((l) => {
        return {
            leagueID: l.id,
            name: l.name,
            isActive: state.findIndex((v) => v.league_id === l.id) >= 0,
        };
    });
}

export async function getLeagueCardSelectorModel(): Promise<LeagueCardSelectorModel> {
    return await convertUserLeaguesState(await getUserLeaguesState());
}

export async function saveLeagueCardSelectorModel(
    cardSelector: LeagueCardSelectorModel
): Promise<LeagueCardSelectorModel> {
    let selected = cardSelector
        .filter((c) => c.isActive)
        .map((c) => c.leagueID);
    return await convertUserLeaguesState(await setUserLeaguesState(selected));
}
