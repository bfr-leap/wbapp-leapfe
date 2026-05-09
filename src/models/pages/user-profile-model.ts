import { getIrLinkState } from '@@/src/utils/fetch-util';

export interface UserProfileModel {
    irCustId: string;
}

export function getDefaultUserProfileModel(): UserProfileModel {
    return { irCustId: '' };
}

export async function getUserProfileModel(): Promise<UserProfileModel> {
    const f = await getIrLinkState();
    return { irCustId: f.irCustId };
}
