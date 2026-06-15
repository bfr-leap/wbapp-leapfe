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

    // The track picker is independent of the league/season lookup, so load
    // it first and populate `tracks` unconditionally. This keeps the calendar
    // admin usable during the transitional window where a brand-new season has
    // been resolved upstream (defLgSeasSubCtx) but has not yet propagated into
    // the curated activeLeagueSchedule — the admin can still add the first
    // events for the new season instead of facing a blank, dead page.
    let trackDisplayInfo = await getCuratedTrackDisplayInfo();
    if (trackDisplayInfo) {
        ret.tracks = Object.keys(trackDisplayInfo)
            .map((k) => {
                return {
                    id: Number.parseInt(k, 10),
                    name: trackDisplayInfo[k].display,
                };
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    } else {
        console.warn(
            '[CDR-ADMIN][read] getCuratedTrackDisplayInfo() returned ' +
                'null/undefined — track picker will be empty'
        );
    }

    let activeLeagueSchedule = await getCuratedActiveLeagueSchedule();
    if (!activeLeagueSchedule) {
        console.warn(
            '[CDR-ADMIN][read] getCuratedActiveLeagueSchedule() returned ' +
                'null/undefined — rendering empty calendar'
        );
        return ret;
    }

    let leagueInfo = activeLeagueSchedule.leagues.find(
        (v) => v.league_id.toString() === league
    );
    let seasonInfo = leagueInfo?.seasons.find(
        (v) => v.season_id.toString() === season
    );

    if (!leagueInfo || !seasonInfo) {
        // Transitional state: the season is live upstream but the curated
        // schedule has not caught up yet. Degrade gracefully to an empty
        // (but populatable) calendar rather than blanking the page.
        console.warn(
            '[CDR-ADMIN][read] league/season not yet present in ' +
                'activeLeagueSchedule — rendering empty calendar (transitional)',
            {
                requestedLeague: league,
                requestedSeason: season,
                leagueFound: !!leagueInfo,
                availableSeasonIds: leagueInfo?.seasons.map((v) =>
                    v.season_id.toString()
                ),
            }
        );
        return ret;
    }

    if (!trackDisplayInfo) {
        // No track names available (already warned above); we can still
        // surface the events, just without resolved display names.
        ret.events = seasonInfo.events.map((e) => ({
            trackDisplayName: '',
            trackId: e.track_id,
            time: new Date(e.time),
            eventId: e.event_id,
        }));
        return ret;
    }

    ret.events = seasonInfo.events.map((e) => {
        if (!trackDisplayInfo[e.track_id]) {
            // A track_id present on an event but absent from trackDisplayInfo
            // would otherwise throw here mid-map and blank the render.
            console.warn(
                '[CDR-ADMIN][read] event references a track_id missing from ' +
                    'trackDisplayInfo',
                { eventId: e.event_id, trackId: e.track_id }
            );
        }
        return {
            trackDisplayName: trackDisplayInfo[e.track_id]?.display ?? '',
            trackId: e.track_id,
            time: new Date(e.time),
            eventId: e.event_id,
        };
    });

    return ret;
}

export async function createSchedEvent(
    model: CdrAdminModel,
    season: string,
    time: string,
    track: string
): Promise<CdrAdminModel> {
    let e = await crtSchedEvent(season, time, track);

    if (e?._error) {
        console.error(
            `[CDR-ADMIN] createSchedEvent server error:`,
            e._source,
            e._message,
            e._url,
            e._baseUrl
        );
        return model;
    }

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
    const result = await updSchedEvent(event, time, track);

    if (result?._error) {
        console.error(
            `[CDR-ADMIN] updateSchedEvent server error:`,
            result._source,
            result._message,
            result._url,
            result._baseUrl
        );
        return model;
    }

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
    const result = await delSchedEvent(event);

    if (result?._error) {
        console.error(
            `[CDR-ADMIN] deleteSchedEvent server error:`,
            result._source,
            result._message,
            result._url,
            result._baseUrl
        );
        return model;
    }

    model.events = model.events.filter((e) => e.eventId !== event);

    return model;
}

/////////////
