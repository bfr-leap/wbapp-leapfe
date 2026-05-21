import { getshortTrackName } from '@@/src/utils/track-utils';

export interface EventCardSmModel {
    shortTrackName: string;
}

export function getDefaultEventCardSmModel(): EventCardSmModel {
    return { shortTrackName: '' };
}

export async function getEventCardSmModel(
    trackId: string
): Promise<EventCardSmModel> {
    if (!trackId) {
        return getDefaultEventCardSmModel();
    }
    return {
        shortTrackName: await getshortTrackName(trackId),
    };
}
