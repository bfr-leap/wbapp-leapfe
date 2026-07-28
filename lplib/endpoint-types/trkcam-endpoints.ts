/**
 * Track-camera highlight index — battles, crashes, overtakes, and starts
 * captured during a race, in addition to the single winner finish-line
 * capture (`/api/trkcam/winner/*`, which has no JSON shape of its own since
 * the frontend only ever renders it as an `<img>` src).
 *
 * Mirrors the broker's `HighlightCapture` shape (see
 * `wbsvc-dtbrkrrd/src/lplib/dtbrkr/ldata-loaders/ldata-trkcam-data-loader.ts`).
 */

export const HIGHLIGHT_CATEGORIES = [
    'battles',
    'crashes',
    'overtakes',
    'starts',
] as const;

export type HighlightCategory = (typeof HIGHLIGHT_CATEGORIES)[number];

export interface HighlightEntry {
    subsession_id: number;
    frame: number;
    /** The driver the highlight features — not necessarily the race winner. */
    driver_user_id: number;
    category: HighlightCategory;
    /** Basename only; unique within `category`, not across categories. */
    file: string;
}
