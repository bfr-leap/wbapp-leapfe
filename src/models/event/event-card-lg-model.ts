import { getTrackName } from '@@/src/utils/track-utils';

export interface EventCardLgModel {
    trackName: string;
}

export function getDefaultEventCardLgModel(): EventCardLgModel {
    return { trackName: '---' };
}

export async function getEventCardLgModel(
    trackId: string
): Promise<EventCardLgModel> {
    if (!trackId) {
        return getDefaultEventCardLgModel();
    }
    return {
        trackName: await getTrackName(trackId),
    };
}
