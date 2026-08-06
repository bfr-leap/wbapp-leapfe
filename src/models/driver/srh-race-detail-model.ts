/**
 * The lazy tier of the srhweb standings feature.
 *
 * Everything the standings table, the points breakdown and the drop-week grid
 * need comes from two documents (`seasonInfo` + `seasonStandings`) fetched
 * eagerly. This module covers what needs the per-race documents: the
 * stewarding ledger, and the per-race points inside the drop-week grid.
 *
 * One document per race — 12 for the sample season — so it is client-only and
 * on demand. Never call this during SSR: `api-client` aborts each request at
 * 5s and the serverless budget is 10s total.
 *
 * Only `raceAdjudications` is fetched. An earlier version also pulled
 * `raceResults` for a per-race points column in the drop-week grid; that
 * column was never built, so the fetch was pure cost — half the requests for
 * data nothing read. Add it back alongside the feature that needs it, not
 * before.
 */

import { getSrhRaceAdjudications } from '@@/src/services/srhweb-service';
import type {
    SeasonInfo,
    RaceAdjudications,
    SessionKey,
} from '@@/src/services/srhweb-types';

import {
    sessionKeyId,
    listRacedSessionKeys,
    eventLabel,
    driverDisplay,
} from './srh-standings-model';

/**
 * Ceiling on how many races we will fetch detail for.
 *
 * A 20-round heat season is 40 races = 80 documents. Rather than silently
 * truncating, we load the most recent `MAX_DETAIL_RACES` and report the gap
 * so the UI can say so.
 */
export const MAX_DETAIL_RACES = 40;

export interface SrhLedgerRow {
    subsessionId: number;
    simsessionNumber: number;
    /** Calendar label for the event this session belongs to. */
    eventLabel: string;
    /** The league's name for this session — "Feature", "Heat 1", … */
    sessionLabel: string;
    /** 1-based round number within the season calendar. */
    round: number;
    custId: number;
    driverName: string;
    /** Negative for a penalty, positive for a bonus. */
    signedPoints: number;
    kind: 'penalty' | 'bonus';
    /** Verbatim league-authored text. No vocabulary is assumed. */
    description: string;
    adjustmentId: number;
}

export interface SrhRaceDetailModel {
    loaded: boolean;
    /** Set when the fetch ran and failed, so the UI can say so rather than
     *  rendering an empty section that looks like "no adjustments". */
    failed: boolean;
    /** Keyed by `sessionKeyId`. */
    adjudicationsByKey: Record<string, RaceAdjudications>;
    ledger: SrhLedgerRow[];
    /** Races omitted because of MAX_DETAIL_RACES. 0 when nothing was dropped. */
    omittedRaces: number;
    /** How many documents this model did (or would) fetch. */
    documentCount: number;
}

export function getDefaultSrhRaceDetailModel(): SrhRaceDetailModel {
    return {
        loaded: false,
        failed: false,
        adjudicationsByKey: {},
        ledger: [],
        omittedRaces: 0,
        documentCount: 0,
    };
}

/**
 * Flatten adjudication documents into one ledger, newest event first.
 *
 * Three things this has to get right:
 *  - `points` is published as a positive magnitude on both sides. The sign
 *    comes from which list the entry is in, so a penalty of 5 becomes -5 here
 *    and no call site has to re-sign it.
 *  - Only raced sessions contribute. Practice and qualifying documents exist
 *    and are empty, but an adjustment filed against one would be a scoring
 *    artefact, not a steward decision about a race.
 *  - `description` is carried verbatim. There is no controlled vocabulary —
 *    leagues word these however they like — so nothing here may switch on it.
 *
 * COMPLETENESS: the ledger reconciles exactly with `bonus_points` /
 * `penalty_points` on the race rows it can address — verified per driver per
 * session across the sample. It does NOT always reconcile with the season
 * totals in `seasonStandings`: a driver with `unattributedStarts > 0` has
 * points, and sometimes adjustments, from an event simracerhub has scored but
 * whose subsession is not yet resolved, so no document exists to list them.
 * One driver in the sample shows 2 bonus points the ledger cannot account for.
 * Every such gap coincides with an unattributed start — none appear
 * independently — so `unattributedStarts` is the honest signal to render
 * beside this, and the ledger must not be presented as the complete record of
 * a season's stewarding.
 */
export function buildAdjudicationLedger(
    docs: RaceAdjudications[],
    info: SeasonInfo,
    racedKeyIds: ReadonlySet<string>
): SrhLedgerRow[] {
    const roundOf = new Map<number, number>();
    const labelOf = new Map<number, string>();
    // Session naming has to come from the event's own race ordering, not from
    // the session number. iRacing counts backwards from the closing race, so
    // simsession -2 is the league's HEAT 1, not "heat 2" — deriving the name
    // arithmetically from the number is off by the number of heats.
    const sessionNameOf = new Map<string, string>();
    info.schedule.forEach((event, i) => {
        if (event.subsession_id === null) return;
        roundOf.set(event.subsession_id, i + 1);
        labelOf.set(event.subsession_id, eventLabel(event));

        const races = (event.sessions || [])
            .filter((s) => s.is_race)
            .sort((a, b) => a.simsession_number - b.simsession_number);
        races.forEach((race, idx) => {
            const key = sessionKeyId([
                event.subsession_id as number,
                race.simsession_number,
            ]);
            // The closing race is the feature; everything before it is a heat,
            // numbered in running order.
            const isLast = idx === races.length - 1;
            sessionNameOf.set(
                key,
                isLast && race.simsession_number === 0
                    ? 'Feature'
                    : `Heat ${idx + 1}`
            );
        });
    });

    const rows: SrhLedgerRow[] = [];
    for (const doc of docs) {
        if (!doc) continue;
        const key = sessionKeyId([doc.subsession_id, doc.simsession_number]);
        if (!racedKeyIds.has(key)) continue;

        const push = (
            kind: 'penalty' | 'bonus',
            list: RaceAdjudications['penalties']
        ) => {
            for (const adj of list ?? []) {
                rows.push({
                    subsessionId: doc.subsession_id,
                    simsessionNumber: doc.simsession_number,
                    eventLabel:
                        labelOf.get(doc.subsession_id) ?? 'Unknown event',
                    sessionLabel: sessionNameOf.get(key) ?? 'Race',
                    round: roundOf.get(doc.subsession_id) ?? 0,
                    custId: adj.cust_id,
                    driverName: (() => {
                        const d = driverDisplay(adj.cust_id, info);
                        return [d.firstName, d.lastName]
                            .filter(Boolean)
                            .join(' ');
                    })(),
                    signedPoints:
                        kind === 'penalty'
                            ? -Math.abs(adj.points)
                            : Math.abs(adj.points),
                    kind,
                    description: adj.description,
                    adjustmentId: adj.adjustment_id,
                });
            }
        };
        push('penalty', doc.penalties);
        push('bonus', doc.bonuses);
    }

    return rows.sort(
        (a, b) => b.round - a.round || b.simsessionNumber - a.simsessionNumber
    );
}

/** The distinct reasons present, for filter chips. Never a hardcoded list. */
export function observedDescriptions(rows: SrhLedgerRow[]): string[] {
    return [...new Set(rows.map((r) => r.description))].sort();
}

/**
 * Fetch per-race detail for a season. Client-only — see the module header.
 */
export async function getSrhRaceDetailModel(
    info: SeasonInfo
): Promise<SrhRaceDetailModel> {
    // `import.meta.server` is Nuxt's SSR flag; guard defensively so this is
    // inert if it is ever called from a server context.
    if (typeof import.meta !== 'undefined' && (import.meta as any).server) {
        return getDefaultSrhRaceDetailModel();
    }

    const allRaces = listRacedSessionKeys(info);
    const omittedRaces = Math.max(0, allRaces.length - MAX_DETAIL_RACES);
    // Keep the most recent races when capped — a season's tail is what a
    // reader is looking at.
    const races: SessionKey[] = omittedRaces
        ? allRaces.slice(-MAX_DETAIL_RACES)
        : allRaces;

    const racedKeyIds = new Set(races.map(sessionKeyId));

    let docs: (RaceAdjudications | null)[];
    try {
        docs = await Promise.all(
            races.map(([sub, sim]) => getSrhRaceAdjudications(sub, sim))
        );
    } catch {
        return {
            ...getDefaultSrhRaceDetailModel(),
            failed: true,
            documentCount: races.length,
        };
    }

    const adjudicationsByKey: Record<string, RaceAdjudications> = {};
    const present: RaceAdjudications[] = [];
    races.forEach(([sub, sim], i) => {
        const doc = docs[i];
        if (doc) {
            adjudicationsByKey[sessionKeyId([sub, sim])] = doc;
            present.push(doc);
        }
    });

    return {
        loaded: true,
        failed: false,
        adjudicationsByKey,
        ledger: buildAdjudicationLedger(present, info, racedKeyIds),
        omittedRaces,
        documentCount: races.length,
    };
}
