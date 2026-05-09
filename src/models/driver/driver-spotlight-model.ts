import {
    getDriverStandingsModel,
    type DriverModel,
} from '@@/src/models/driver/driver-standings-model';
import { getPastEventCardsModel } from '@@/src/models/event/past-events-cards-model';
import {
    getSimsessionResults,
    getTrackInfoDirectory,
} from '@@/src/utils/fetch-util';
import { getPhotoIndex, pickHeroPhoto } from '@@/src/services/photo-service';
import { resolveProtagonistCustId } from './protagonist';

export interface SpotlightLastRace {
    trackId: string;
    trackName: string;
    date: string;
    finishPosition: number;
    startPosition: number;
    positionsGained: number;
}

export interface DriverSpotlightModel {
    leagueId: string;
    seasonId: string;
    hasDriver: boolean;
    driver: DriverModel | null;
    deltaToAhead: number | null;
    fieldSize: number;
    lastRace: SpotlightLastRace | null;
    heroPhotoUrl: string | null;
    heroPhotoCaption: string | null;
}

export function getDefaultDriverSpotlightModel(): DriverSpotlightModel {
    return {
        leagueId: '',
        seasonId: '',
        hasDriver: false,
        driver: null,
        deltaToAhead: null,
        fieldSize: 0,
        lastRace: null,
        heroPhotoUrl: null,
        heroPhotoCaption: null,
    };
}

export async function getDriverSpotlightModel(
    league: string,
    season: string,
    isSignedIn: boolean
): Promise<DriverSpotlightModel> {
    const ret = getDefaultDriverSpotlightModel();
    if (!league || !season) return ret;

    ret.leagueId = league;
    ret.seasonId = season;

    const standings = await getDriverStandingsModel(league, season, false);
    if (!standings.drivers.length) return ret;

    const protagonistCustId = await resolveProtagonistCustId(
        league,
        season,
        isSignedIn
    );
    const pick =
        standings.drivers.find((d) => d.custId === protagonistCustId) ?? null;
    if (!pick) return ret;

    ret.driver = pick;
    ret.hasDriver = true;
    ret.fieldSize = standings.drivers.length;

    if (pick.position > 1) {
        const ahead = standings.drivers.find(
            (d) => d.position === pick.position - 1
        );
        if (ahead) ret.deltaToAhead = ahead.points - pick.points;
    }

    const past = await getPastEventCardsModel(league, season);
    const now = Date.now();
    const completed = past.pastRaces
        .filter(
            (r) =>
                r.date &&
                new Date(r.date).getTime() <= now &&
                r.sessionId &&
                r.simsessionId
        )
        .sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
    const latest = completed[0];
    if (!latest) return ret;

    const [sim, trackInfo, photoIndex] = await Promise.all([
        getSimsessionResults(latest.sessionId, latest.simsessionId),
        getTrackInfoDirectory(league),
        getPhotoIndex(latest.sessionId, latest.simsessionId),
    ]);
    const entry = sim?.results.find(
        (r) => r.cust_id.toString() === pick.custId
    );
    if (!entry) return ret;

    ret.lastRace = {
        trackId: latest.trackId,
        trackName: trackInfo?.track_display?.[latest.trackId] || latest.trackId,
        date: latest.date,
        finishPosition: entry.position,
        startPosition: entry.start_position,
        positionsGained: entry.start_position - entry.position,
    };

    const hero = pickHeroPhoto(photoIndex?.photos ?? [], pick.custId);
    if (hero) {
        ret.heroPhotoUrl = hero.url;
        ret.heroPhotoCaption = hero.caption ?? null;
    }

    return ret;
}
