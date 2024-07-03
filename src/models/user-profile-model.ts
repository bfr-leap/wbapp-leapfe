import { getIrLinkState, setIrLinkDriver, setIrLinkCode } from '@/utils/fetch-util';

export interface UserProfileModel {
    isVerified: boolean | null;
    irCustId: string;
    msgSent: boolean;
    enableCustIdSendButton: boolean;
    enableVerifySendButton: boolean;
}

export function getDefaultUserProfileModel(): UserProfileModel {
    return JSON.parse(
        JSON.stringify({
            isVerified: null,
            irCustId: '1234',
            enableCustIdSendButton: true,
            enableVerifySendButton: true,
            msgSent: false
        })
    );
}

export async function getUserProfileModel(): Promise<UserProfileModel> {
    let ret = getDefaultUserProfileModel();

    const f = await getIrLinkState();

    console.log(f);

    ret.isVerified = f.isVerified;
    ret.irCustId = f.irCustId;
    ret.msgSent = f.msgSent;

    return ret;
}

export async function sendCustId(driver: string): Promise<UserProfileModel> {
    await setIrLinkDriver(driver);
    let ret = await getUserProfileModel();
    return ret;
}

export async function sendVerification(code: number): Promise<UserProfileModel> {
    await setIrLinkCode(code);
    let ret = await getUserProfileModel();
    return ret;
}
