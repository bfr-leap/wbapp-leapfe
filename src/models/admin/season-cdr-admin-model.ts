import {
    getCuratedActiveLeagueSchedule,
    getCuratedTrackDisplayInfo,
    crtSchedEvent,
    updSchedEvent,
    delSchedEvent,
} from '@@/src/utils/fetch-util';
import { getTrackName } from '@@/src/utils/track-utils';

export interface CdrAdminEvent {
    time: Date;
    trackId: number;
    trackDisplayName: string;
    eventId: string;
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

    let activeLeagueSchedule = await getCuratedActiveLeagueSchedule();

    if (!activeLeagueSchedule) {
        return ret;
    }

    let leagueInfo = activeLeagueSchedule.leagues.find(
        (v) => v.league_id.toString() === league
    );
    if (!leagueInfo) {
        return ret;
    }

    let seasonInfo = leagueInfo.seasons.find(
        (v) => v.season_id.toString() === season
    );
    if (!seasonInfo) {
        return ret;
    }

    let trackDisplayInfo = await getCuratedTrackDisplayInfo();
    if (!trackDisplayInfo) {
        return ret;
    }

    let events = seasonInfo.events;
    ret.events = events.map((e) => {
        return {
            trackDisplayName: trackDisplayInfo[e.track_id].display,
            trackId: e.track_id,
            time: new Date(e.time),
            eventId: e.event_id,
        };
    });

    ret.tracks = Object.keys(trackDisplayInfo)
        .map((k) => {
            return {
                id: Number.parseInt(k, 10),
                name: trackDisplayInfo[k].display,
            };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

    return ret;
}

export async function createSchedEvent(
    model: CdrAdminModel,
    season: string,
    time: string,
    track: string
): Promise<CdrAdminModel> {
    let e = await crtSchedEvent(season, time, track);

    const ev = {
        trackDisplayName: await getTrackName(e.track_id.toString()),
        trackId: e.track_id,
        time: new Date(e.time),
        eventId: e.event_id,
    };

    model.events.push(ev);

    model.events.sort((a, b) => a.time.getTime() - b.time.getTime());

    return model;
}

export async function updateSchedEvent(
    model: CdrAdminModel,
    event: string,
    time: string,
    track: string
): Promise<CdrAdminModel> {
    await updSchedEvent(event, time, track);

    const e = model.events.find((e) => e.eventId === event);
    if (e) {
        e.time = new Date(Number.parseInt(time, 10));
        e.trackId = Number.parseInt(track, 10);
        e.trackDisplayName = await getTrackName(e.trackId.toString());
    }

    model.events.sort((a, b) => a.time.getTime() - b.time.getTime());

    return model;
}

export async function deleteSchedEvent(
    model: CdrAdminModel,
    event: string
): Promise<CdrAdminModel> {
    await delSchedEvent(event);

    model.events = model.events.filter((e) => e.eventId !== event);

    return model;
}

/////////////
