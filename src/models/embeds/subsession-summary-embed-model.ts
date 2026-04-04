import { getGeneratedSimsessionSummary } from '@@/src/services/results-service';
import {
    getLeagueSeasons,
    getLeagueSeasonSessions,
    getLeagueSimsessionIndex,
} from '@@/src/services/league-service';

export interface SubsessionSummaryEmbedModel {
    title: string;
    summaryText: string[];
    isLight: boolean;
    league: string;
    season: string;
    subsession: string;
    simsession: string;
    prevSubsession: string;
    nextSubsession: string;
    hasPrev: boolean;
    hasNext: boolean;
}

export function getDefaultSubsessionSummaryEmbedModel(): SubsessionSummaryEmbedModel {
    return {
        title: '',
        summaryText: [''],
        isLight: false,
        league: '',
        season: '',
        subsession: '',
        simsession: '',
        prevSubsession: '',
        nextSubsession: '',
        hasPrev: false,
        hasNext: false,
    };
}

export async function getSubsessionSummaryEmbedModel(
    league: string,
    season: string,
    subsession: string,
    isLight: boolean
): Promise<SubsessionSummaryEmbedModel> {
    const ret = getDefaultSubsessionSummaryEmbedModel();
    ret.isLight = isLight;
    ret.league = league;

    if (!league) {
        return ret;
    }

    // ── Resolve season ────────────────────────────────────────
    const leagueSeasons = await getLeagueSeasons(league);
    if (!leagueSeasons?.seasons?.length) {
        return ret;
    }

    let seasonName = '';

    if (season) {
        ret.season = season;
        seasonName =
            leagueSeasons.seasons.find((s) => s.season_id.toString() === season)
                ?.season_name || '';
    } else {
        // Pick the latest active season, or fall back to the last one
        const active = leagueSeasons.seasons.find((s) => s.active);
        const picked = active || leagueSeasons.seasons[0];
        ret.season = picked.season_id.toString();
        seasonName = picked.season_name;
    }

    // ── Get sessions for the season ───────────────────────────
    const seasonSessions = await getLeagueSeasonSessions(league, ret.season);
    const sessions = seasonSessions?.sessions || [];

    if (!sessions.length) {
        ret.title = seasonName;
        return ret;
    }

    // Sort by launch_at ascending so we can navigate chronologically
    sessions.sort(
        (a, b) =>
            new Date(a.launch_at).getTime() - new Date(b.launch_at).getTime()
    );

    // ── Get simsession index to find race simsession IDs ──────
    const simsessionIndex = await getLeagueSimsessionIndex(league);
    const seasonIndex = simsessionIndex?.find(
        (s) => s.season_id.toString() === ret.season
    );

    function getRaceSimsessionId(subsessionId: number): number {
        const sess = seasonIndex?.sessions.find(
            (s) => s.subsession_id === subsessionId
        );
        const race = sess?.simsessions.find((s) => s.type === 'race');
        return race?.simsession_id ?? 0;
    }

    // ── Resolve subsession ────────────────────────────────────
    let currentIndex = -1;

    if (subsession) {
        ret.subsession = subsession;
        currentIndex = sessions.findIndex(
            (s) => s.subsession_id.toString() === subsession
        );
    } else {
        // Pick the latest session (last in chronological order)
        const latest = sessions[sessions.length - 1];
        ret.subsession = latest.subsession_id.toString();
        currentIndex = sessions.length - 1;
    }

    if (currentIndex === -1) {
        ret.title = seasonName;
        return ret;
    }

    const currentSession = sessions[currentIndex];
    const trackName = currentSession.track.track_name;
    ret.title = `${seasonName} - ${trackName}`;
    ret.simsession = getRaceSimsessionId(
        currentSession.subsession_id
    ).toString();

    // ── Fetch the summary ─────────────────────────────────────
    const summary = await getGeneratedSimsessionSummary(
        Number.parseInt(ret.subsession, 10),
        Number.parseInt(ret.simsession, 10)
    );
    ret.summaryText = summary?.text.split('\n') || [];

    // ── Resolve prev / next navigation ────────────────────────
    // Check previous events (walk backwards) for one with a summary
    for (let i = currentIndex - 1; i >= 0; i--) {
        const sess = sessions[i];
        const simsessionId = getRaceSimsessionId(sess.subsession_id);
        const prevSummary = await getGeneratedSimsessionSummary(
            sess.subsession_id,
            simsessionId
        );
        if (prevSummary?.text) {
            ret.prevSubsession = sess.subsession_id.toString();
            ret.hasPrev = true;
            break;
        }
    }

    // Check next events (walk forwards) for one with a summary
    for (let i = currentIndex + 1; i < sessions.length; i++) {
        const sess = sessions[i];
        const simsessionId = getRaceSimsessionId(sess.subsession_id);
        const nextSummary = await getGeneratedSimsessionSummary(
            sess.subsession_id,
            simsessionId
        );
        if (nextSummary?.text) {
            ret.nextSubsession = sess.subsession_id.toString();
            ret.hasNext = true;
            break;
        }
    }

    return ret;
}
