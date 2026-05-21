import {
    getDriverResults,
    getGeneratedSimsessionSummary,
    getLeagueSeasonSessions,
    getLeagueSimsessionIndex,
} from '@@/src/utils/fetch-util';
import type { SSI_Session } from 'lplib/endpoint-types/iracing-endpoints';

export interface PastEventCardEntry {
    sessionId: string;
    simsessionId: string;
    trackId: string;
    date: string;
    isSelected: boolean;
    /** The race winner's display name, from `leagueSeasonSessions`. */
    winnerName?: string;
    /**
     * The AI-generated headline for the race (e.g.
     * "Merchant Devours Glen, Shocks Universe"). Pulled from the
     * `simsessionSummary` document per race; missing when the
     * summary hasn't been generated yet.
     */
    headline?: string;
    protagonistFinish?: number;
    protagonistStart?: number;
}

export interface PastEventCardsModel {
    pastRaces: PastEventCardEntry[];
}

export function getDefaultPastEventCardsModel(): PastEventCardsModel {
    return { pastRaces: [] };
}

export async function getPastEventCardsModel(
    league: string,
    season: string,
    irCustId?: string
): Promise<PastEventCardsModel> {
    let ret: PastEventCardsModel = getDefaultPastEventCardsModel();

    if (!league || !season) {
        return ret;
    }

    let [leagueSeasonSessions, simsessionIndex, driverResults] =
        await Promise.all([
            getLeagueSeasonSessions(league, season),
            getLeagueSimsessionIndex(league),
            irCustId
                ? getDriverResults(league, irCustId, 'race')
                : Promise.resolve(null),
        ]);

    let seasonIndex = simsessionIndex?.find(
        (s) => s.season_id.toString() === season
    );

    const seasonResults = driverResults?.[Number.parseInt(season)] ?? null;

    // First pass: assemble the entries we can build without an extra
    // broker call.
    const entries: { entry: PastEventCardEntry; subId: number; raceSim: number }[] = [];
    for (let session of leagueSeasonSessions?.sessions || []) {
        if (session?.subsession_id) {
            let ssiSession: SSI_Session | undefined =
                seasonIndex?.sessions.find(
                    (s) => s.subsession_id === session.subsession_id
                );
            let raceSimsession = ssiSession?.simsessions.find(
                (s) => s.type === 'race'
            );
            let simsessionId =
                raceSimsession?.simsession_id ??
                ssiSession?.simsessions[0]?.simsession_id;

            const entry: PastEventCardEntry = {
                trackId: session.track.track_id.toString(),
                date: session.launch_at,
                isSelected: false,
                sessionId: session?.subsession_id?.toString() || '',
                simsessionId: simsessionId?.toString() || '',
            };

            if (session.winner_name) {
                entry.winnerName = session.winner_name;
            }

            const result = seasonResults?.[session.subsession_id];
            if (result) {
                entry.protagonistFinish = result.position;
                entry.protagonistStart = result.start_position;
            }

            entries.push({
                entry,
                subId: session.subsession_id,
                raceSim: typeof simsessionId === 'number' ? simsessionId : 0,
            });
        }
    }

    // Second pass: fetch AI-generated headlines in parallel. A
    // missing summary is the common case for in-progress seasons —
    // we just drop the headline rather than erroring the whole strip.
    const summaries = await Promise.all(
        entries.map(({ subId, raceSim }) =>
            getGeneratedSimsessionSummary(subId, raceSim).catch(() => null)
        )
    );
    for (let i = 0; i < entries.length; i++) {
        const summary = summaries[i];
        if (summary?.title) {
            entries[i].entry.headline = summary.title;
        }
        ret.pastRaces.push(entries[i].entry);
    }

    return ret;
}
