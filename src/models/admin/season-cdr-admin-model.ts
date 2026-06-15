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

    // [CDR-ADMIN][read] Instrumentation: the read path has four silent
    // early-return points that each yield an empty page. Log the inputs
    // and which guard (if any) trips so we can tell *why* it's empty.
    // Remove once the empty-calendar bug is diagnosed.
    console.debug('[CDR-ADMIN][read] getCdrAdminModel called', {
        league,
        season,
        leagueType: typeof league,
        seasonType: typeof season,
    });

    let activeLeagueSchedule = await getCuratedActiveLeagueSchedule();

    if (!activeLeagueSchedule) {
        console.warn(
            '[CDR-ADMIN][read] guard #1: getCuratedActiveLeagueSchedule() ' +
                'returned null/undefined — returning empty model',
            { activeLeagueSchedule }
        );
        return ret;
    }

    console.debug('[CDR-ADMIN][read] schedule loaded', {
        leagueCount: activeLeagueSchedule.leagues?.length,
        availableLeagueIds: activeLeagueSchedule.leagues?.map((v) =>
            v.league_id?.toString()
        ),
    });

    let leagueInfo = activeLeagueSchedule.leagues.find(
        (v) => v.league_id.toString() === league
    );
    if (!leagueInfo) {
        console.warn(
            '[CDR-ADMIN][read] guard #2: no league in schedule matches the ' +
                'requested league id — returning empty model',
            {
                requestedLeague: league,
                availableLeagueIds: activeLeagueSchedule.leagues.map((v) =>
                    v.league_id.toString()
                ),
            }
        );
        return ret;
    }

    let seasonInfo = leagueInfo.seasons.find(
        (v) => v.season_id.toString() === season
    );
    if (!seasonInfo) {
        console.warn(
            '[CDR-ADMIN][read] guard #3: no season in league matches the ' +
                'requested season id — returning empty model',
            {
                requestedSeason: season,
                requestedLeague: league,
                availableSeasonIds: leagueInfo.seasons.map((v) =>
                    v.season_id.toString()
                ),
            }
        );
        return ret;
    }

    console.debug('[CDR-ADMIN][read] season matched', {
        league,
        season,
        eventCount: seasonInfo.events?.length,
    });

    let trackDisplayInfo = await getCuratedTrackDisplayInfo();
    if (!trackDisplayInfo) {
        console.warn(
            '[CDR-ADMIN][read] guard #4: getCuratedTrackDisplayInfo() ' +
                'returned null/undefined — returning empty model',
            { trackDisplayInfo }
        );
        return ret;
    }

    let events = seasonInfo.events;
    ret.events = events.map((e) => {
        // [CDR-ADMIN][read] A track_id present on an event but absent from
        // trackDisplayInfo would throw here mid-map and blank the render.
        // Surface it explicitly instead of letting it crash silently.
        if (!trackDisplayInfo[e.track_id]) {
            console.warn(
                '[CDR-ADMIN][read] event references a track_id missing from ' +
                    'trackDisplayInfo',
                { eventId: e.event_id, trackId: e.track_id }
            );
        }
        return {
            trackDisplayName: trackDisplayInfo[e.track_id]?.display,
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
