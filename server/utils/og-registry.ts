/**
 * Mode → renderer registry.
 *
 * Single source of truth for which page modes have OG previews and
 * what builds them. Both `server/middleware/00-og-bot.ts` (which
 * generates the HTML stub) and `server/api/og.get.ts` (which
 * generates the image) read from this map, so adding a new mode is a
 * one-line change here plus a new `og-render-<mode>.ts` file.
 *
 * The home view is registered under the empty string (`m=''` /
 * absent) so the dispatch is a single uniform lookup; the middleware
 * normalizes a missing `m` query param to `''` before lookup.
 */

import type { H3Event } from 'h3';
import { type OgPayload } from './og-render-shared';

import { buildHomeOgPayload, renderHomeCardSvg } from './og-render-home';
import {
    buildResultsOgPayload,
    renderResultsCardSvg,
} from './og-render-results';
import {
    buildStandingsOgPayload,
    renderStandingsCardSvg,
} from './og-render-standings';
import { buildDriverOgPayload, renderDriverCardSvg } from './og-render-driver';
import { buildTeamOgPayload, renderTeamCardSvg } from './og-render-team';
import { buildTrackOgPayload, renderTrackCardSvg } from './og-render-track';
import { buildSeasonOgPayload, renderSeasonCardSvg } from './og-render-season';
import {
    buildRulingsOgPayload,
    renderRulingsCardSvg,
} from './og-render-rulings';

interface OgModeRenderer {
    payload: (
        event: H3Event,
        query: Record<string, string>
    ) => Promise<OgPayload>;
    image: (event: H3Event, query: Record<string, string>) => Promise<string>;
}

export const OG_MODE_REGISTRY: Record<string, OgModeRenderer> = {
    '': { payload: buildHomeOgPayload, image: renderHomeCardSvg },
    results: { payload: buildResultsOgPayload, image: renderResultsCardSvg },
    standings: {
        payload: buildStandingsOgPayload,
        image: renderStandingsCardSvg,
    },
    driver: { payload: buildDriverOgPayload, image: renderDriverCardSvg },
    team: { payload: buildTeamOgPayload, image: renderTeamCardSvg },
    track: { payload: buildTrackOgPayload, image: renderTrackCardSvg },
    season: { payload: buildSeasonOgPayload, image: renderSeasonCardSvg },
    rulings: { payload: buildRulingsOgPayload, image: renderRulingsCardSvg },
    // m=profile is auth-only so an anonymous unfurler can't surface
    // anything personalized — falls through to the brand card.
    // m=nextEventTimerEmbed and m=subsessionSummaryEmbed are iframe
    // embeds, not shareable URLs, so they're intentionally absent.
};

export function lookupModeRenderer(mode: string): OgModeRenderer | null {
    return OG_MODE_REGISTRY[mode] || null;
}
