/**
 * Photo service — editorial stills captured per race subsession.
 *
 * Backed by the data lake at ldata-photos/photoIndex/<subsession>/<simsession>.
 */

import { fetchCachedDocument } from '@@/src/utils/api-client';
import type {
    PhotoIndex,
    PhotoEntry,
} from '@@/lplib/endpoint-types/photo-endpoints';

export async function getPhotoIndex(
    subsession: string,
    simsession: string
): Promise<PhotoIndex | null> {
    if (!subsession || !simsession) return null;
    const namespace = 'ldata-photos';
    const type = 'photoIndex';
    return await fetchCachedDocument<PhotoIndex>({
        namespace,
        type,
        subsession,
        simsession,
    });
}

/**
 * Pick the best hero photo for a given protagonist out of an index.
 *
 * Preference order:
 *   1. Photos that feature the protagonist's cust_id, ranked by `score`.
 *   2. Otherwise, top-scored photo overall.
 *
 * Pure function — kept separate from the async fetcher for testability.
 */
export function pickHeroPhoto(
    photos: PhotoEntry[],
    protagonistCustId: string
): PhotoEntry | null {
    if (!photos || photos.length === 0) return null;

    const custIdNum = Number.parseInt(protagonistCustId);
    const featured = Number.isFinite(custIdNum)
        ? photos.filter((p) => p.featured_cust_ids?.includes(custIdNum))
        : [];

    const pool = featured.length > 0 ? featured : photos;
    return [...pool].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0] ?? null;
}
