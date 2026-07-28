/**
 * Track-camera highlight index — battles, crashes, overtakes, and starts
 * captured during a race. Distinct from the single winner finish-line
 * capture (`driver-spotlight-model.ts`'s `heroPhotoUrl`), which is rendered
 * as a plain `<img>` and has no JSON index of its own.
 *
 * Bypasses `fetchCachedDocument` the same way the winner captures do:
 * these routes proxy the broker's `/trkcam/highlights/*` surface directly
 * (see `server/utils/trkcam-proxy.ts`), not the namespace-based document
 * broker, so there's nothing to key a fixture/cache entry on.
 */

import { fetchJsonPath } from '@@/src/utils/api-client';
import type {
    HighlightCategory,
    HighlightEntry,
} from '@@/lplib/endpoint-types/trkcam-endpoints';

function categoryQuery(category?: HighlightCategory): string {
    return category ? `?category=${encodeURIComponent(category)}` : '';
}

/** Highlights captured during a single subsession, in replay order. */
export async function getHighlightsForSubsession(
    subsessionId: string,
    category?: HighlightCategory
): Promise<HighlightEntry[]> {
    if (!subsessionId) return [];
    const path = `/api/trkcam/highlights/${encodeURIComponent(
        subsessionId
    )}${categoryQuery(category)}`;
    const result = await fetchJsonPath<HighlightEntry[]>(path);
    return Array.isArray(result) ? result : [];
}

/** Every highlight featuring a driver, newest subsession first. */
export async function getHighlightsForDriver(
    custId: string,
    category?: HighlightCategory
): Promise<HighlightEntry[]> {
    if (!custId) return [];
    const path = `/api/trkcam/highlights/driver/${encodeURIComponent(
        custId
    )}${categoryQuery(category)}`;
    const result = await fetchJsonPath<HighlightEntry[]>(path);
    return Array.isArray(result) ? result : [];
}

export function highlightImageUrl(entry: HighlightEntry): string {
    return `/api/trkcam/highlight/${entry.category}/${entry.file}`;
}

export const HIGHLIGHT_CATEGORY_LABELS: Record<HighlightCategory, string> = {
    battles: 'Battle',
    crashes: 'Incident',
    overtakes: 'Overtake',
    starts: 'Start',
};
