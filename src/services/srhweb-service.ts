/**
 * simracerhub championship data service — `ldata-srhweb`.
 *
 * Four document types, one per dataset directory. `seasonInfo` is the entry
 * point: it carries the class list that addresses `seasonStandings`, and the
 * schedule that addresses `raceResults` and `raceAdjudications`.
 *
 * Coverage is partial — only leagues that score on simracerhub are in this
 * dataset. A league without it returns `null` from every accessor here, which
 * callers must treat as "fall back", not as an error.
 */

import { fetchCachedDocument } from '@@/src/utils/api-client';
import type {
    SeasonInfo,
    SeasonStandings,
    RaceResults,
    RaceAdjudications,
} from '@@/src/services/srhweb-types';

const NAMESPACE = 'ldata-srhweb';

export async function getSrhSeasonInfo(
    league: string,
    season: string
): Promise<SeasonInfo | null> {
    const namespace = NAMESPACE;
    const type = 'seasonInfo';
    return await fetchCachedDocument<SeasonInfo>({
        namespace,
        type,
        league,
        season,
    });
}

/**
 * One class's championship table.
 *
 * `classId` comes from `SeasonInfo.classes`. Single-class seasons carry the
 * synthetic class `0`, so 0 is the common case rather than a missing value —
 * it is sent as a string so it survives the empty-value filters in both
 * `lplib/dtbrkr/dtlkdata.ts` and `fetch-document.ts`'s fixture key.
 *
 * `class` is only in the broker's scope-param whitelist because of a local
 * addition to the vendored proxy; see `lplib/README-DIVERGENCE.md`. If that is
 * ever lost this silently returns null and the app falls back.
 */
export async function getSrhSeasonStandings(
    league: string,
    season: string,
    classId: number | string
): Promise<SeasonStandings | null> {
    const namespace = NAMESPACE;
    const type = 'seasonStandings';
    return await fetchCachedDocument<SeasonStandings>({
        namespace,
        type,
        league,
        season,
        class: String(classId),
    });
}

/**
 * One sim session's results.
 *
 * `simsession` is iRacing's signed number — `0` for the closing race, `-2` for
 * a heat. Pass it as the integer. The `n2` spelling is the broker's on-disk
 * filename encoding, applied server-side; sending it here 404s.
 */
export async function getSrhRaceResults(
    subsession: number | string,
    simsession: number | string
): Promise<RaceResults | null> {
    const namespace = NAMESPACE;
    const type = 'raceResults';
    return await fetchCachedDocument<RaceResults>({
        namespace,
        type,
        subsession: String(subsession),
        simsession: String(simsession),
    });
}

/**
 * Steward penalties and bonuses for one sim session.
 *
 * A document with two empty lists is a normal result — most races are scored
 * without intervention. Only a missing document returns `null`.
 */
export async function getSrhRaceAdjudications(
    subsession: number | string,
    simsession: number | string
): Promise<RaceAdjudications | null> {
    const namespace = NAMESPACE;
    const type = 'raceAdjudications';
    return await fetchCachedDocument<RaceAdjudications>({
        namespace,
        type,
        subsession: String(subsession),
        simsession: String(simsession),
    });
}
