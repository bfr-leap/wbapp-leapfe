/**
 * Pure decision function: which scope chip belongs in the header
 * for a given route + resolved league/season context.
 *
 * Extracted from pages/index.vue so the rule can be tested in
 * isolation. The page itself reads from the resolved context
 * (defaults filled in by defLgSeasSubCtx for missing query
 * params), so the chip choice must match the same source —
 * checking route.query.subsession / simsession directly causes
 * the chip to fall through to LeagueSeasonChip when the URL is
 * incomplete (e.g. ?m=results&league=X with no inner ids).
 *
 * Track Stats is the exception: it uses URL params directly
 * because car and track are not part of defLgSeasSubCtx.
 */

export type ChipKind = 'results' | 'track' | 'league-season' | null;

export interface ChipSelectorContext {
    league_id?: number;
    season_id?: number;
}

export interface ChipSelectorRouteQuery {
    m?: string;
    car?: string;
    track?: string;
}

export function selectChip(
    query: ChipSelectorRouteQuery,
    ctx: ChipSelectorContext
): ChipKind {
    if (query.m === 'results' && ctx.league_id) return 'results';
    if (query.m === 'track' && query.car && query.track) return 'track';
    if (ctx.league_id && ctx.season_id) return 'league-season';
    return null;
}
