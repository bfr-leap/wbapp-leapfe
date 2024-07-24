import {
    getCuratedActiveLeagueSchedule,
    getCuratedTrackDisplayInfo,
} from '@/utils/fetch-util';
import { getTrackName } from '@/utils/track-utils';

export interface CdrAdminEvent {
    time: Date;
    trackId: number;
    trackDisplayName: string;
    displayName: string;
}

export interface CdrAdminTrackOption {
    id: number;
    name: string;
}

export interface CdrAdminModel {
    events: CdrAdminEvent[];
    tracks: CdrAdminTrackOption[];
}

export function getDefaultCdrAdminModel(): CdrAdminModel {
    return { events: [], tracks: [] };
}

export async function getCdrAdminModel(
    league: string,
    season: string
): Promise<CdrAdminModel> {
    let ret = getDefaultCdrAdminModel();

    let x = await getCuratedActiveLeagueSchedule();

    if (!x) {
        return ret;
    }

    let leagueInfo = x.leagues.find((v) => v.league_id.toString() === league);
    if (!leagueInfo) {
        return ret;
    }

    let seasonInfo = leagueInfo.seasons.find(
        (v) => v.season_id.toString() === season
    );
    if (!seasonInfo) {
        return ret;
    }

    let events = seasonInfo.events;

    ret.events = events.map((e) => {
        return {
            displayName: e.comment,
            trackId: e.track_id,
            trackDisplayName: '',
            time: new Date(e.time),
        };
    });

    for (let e of ret.events) {
        e.trackDisplayName = await getTrackName(e.trackId.toString());
    }

    let displayInfo = await getCuratedTrackDisplayInfo();
    if (!displayInfo) {
        return ret;
    }

    ret.tracks = Object.keys(displayInfo)
        .map((k) => {
            return { id: Number.parseInt(k, 10), name: displayInfo[k].display };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

    return ret;
}
