import { getshortTrackName } from '@@/src/utils/track-utils';

export interface EventCardPastModel {
    shortTrackName: string;
}

export function getDefaultEventCardPastModel(): EventCardPastModel {
    return { shortTrackName: '' };
}

export async function getEventCardPastModel(
    trackId: string
): Promise<EventCardPastModel> {
    if (!trackId) {
        return getDefaultEventCardPastModel();
    }
    return {
        shortTrackName: await getshortTrackName(trackId),
    };
}
