/**
 * Photo index — metadata for editorial stills captured per race subsession.
 *
 * Storage layout (data lake):
 *   photographs/<subsession>/<filename>.jpg
 *   photoIndex/<subsession>/<simsession>.json   ← shape below
 *
 * The frontend never enumerates the photographs/ folder directly. It reads
 * the index, picks the photos it wants by metadata, then renders <img> tags
 * pointing at each entry's `url`.
 */

export interface PhotoEntry {
    /** Filename inside photographs/<subsession>/ — e.g. "1700000000.jpg". */
    filename: string;
    /**
     * Resolvable URL for the image. Absolute is simplest (e.g. a CDN URL).
     * If relative, the consumer is responsible for prefixing the data-lake
     * base. Recommend absolute to avoid ambiguity.
     */
    url: string;

    /** Optional positioning info — useful for picking the most photogenic shots. */
    session_time?: number; // seconds into the simsession
    lap_number?: number;

    /**
     * cust_ids of drivers prominently featured in the frame. Used by the
     * Spotlight to prefer photos that include the signed-in user / current
     * protagonist.
     */
    featured_cust_ids?: number[];

    /**
     * Free-form tags so different surfaces can ask for the right kind of shot:
     *   "scenic", "overtake", "podium", "start", "incident", "panning"
     */
    tags?: string[];

    /** Optional caption for cards that show one. */
    caption?: string;

    /** Image dimensions — helps with responsive layout / aspect ratio. */
    width?: number;
    height?: number;

    /**
     * Quality score 0..1 from whatever picker produced this set. The FE
     * uses it as the primary tiebreaker.
     */
    score?: number;
}

export interface PhotoIndex {
    subsession_id: number;
    simsession_id: number;
    photos: PhotoEntry[];
}
