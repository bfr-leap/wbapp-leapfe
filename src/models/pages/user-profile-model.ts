import { getIrLinkState } from '@@/src/utils/fetch-util';

export interface UserProfileModel {
    isVerified: boolean | null;
    irCustId: string;
}

export function getDefaultUserProfileModel(): UserProfileModel {
    return { isVerified: null, irCustId: '' };
}

export async function getUserProfileModel(): Promise<UserProfileModel> {
    const f = await getIrLinkState();
    return { isVerified: f.isVerified, irCustId: f.irCustId };
}
