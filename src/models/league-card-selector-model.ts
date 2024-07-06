import { getUserLeaguesState } from '@/utils/fetch-util';

type LeagueCardSelectorModel = {
    isActive: boolean, name: string
}[];

export function getDefaultLeagueCardSelectorModel(): LeagueCardSelectorModel {
    return JSON.parse(
        JSON.stringify([])
    );
}

export async function getLeagueCardSelectorModel(): Promise<LeagueCardSelectorModel> {
    await getUserLeaguesState();
    return [];
}

export async function saveLeagueCardSelectorModel(cardSelector: LeagueCardSelectorModel) { }