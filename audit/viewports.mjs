/**
 * Viewport set for visual audits. Each entry is what Playwright passes
 * to `context.viewport` / `context.deviceScaleFactor` / `context.isMobile`.
 *
 * The five sizes are chosen to span the layouts a user actually sees:
 *
 *   mbp-full         Desktop browser maximized on a 15"/16" MacBook
 *                    Pro. Triggers the >=992px header tab row, full
 *                    1280px content rail.
 *   mbp-two-thirds   Browser snapped to two thirds of the screen
 *                    (common when an editor or chat lives in the other
 *                    third). Still desktop layout, narrower content.
 *   mbp-quarter      Browser snapped to a quarter of the screen. Falls
 *                    below the 992px breakpoint, so the bottom-nav
 *                    appears and the desktop tab row hides — same
 *                    layout family as phone portrait, but at 2x DPR.
 *   iphone-portrait  iPhone 14/15 Pro logical viewport (390x844 at
 *                    DPR 3). The canonical phone case.
 *   iphone-landscape Same device rotated. Catches "did anyone test
 *                    the rare landscape phone reader?" failures.
 *
 * Heights are intentionally bigger than the device's real visible
 * height — Playwright's `fullPage: true` screenshot grows the capture
 * to the document height anyway, the viewport height only affects
 * what's painted "above the fold" during initial render. Using a
 * generous height keeps lazy-mount components in the first paint.
 */

/**
 * @typedef {Object} Viewport
 * @property {number} width
 * @property {number} height
 * @property {number} deviceScaleFactor
 * @property {boolean} isMobile
 * @property {string} description
 */

/** @type {Record<string, Viewport>} */
export const VIEWPORTS = {
    'mbp-full': {
        width: 1440,
        height: 900,
        deviceScaleFactor: 2,
        isMobile: false,
        description: 'MacBook Pro, browser maximized (~1440 logical px)',
    },
    'mbp-two-thirds': {
        width: 960,
        height: 900,
        deviceScaleFactor: 2,
        isMobile: false,
        description: 'MacBook Pro, browser at ~2/3 width (split with sidebar)',
    },
    'mbp-quarter': {
        width: 432,
        height: 900,
        deviceScaleFactor: 2,
        isMobile: false,
        description: 'MacBook Pro, browser snapped to ~1/4 width',
    },
    'iphone-portrait': {
        width: 390,
        height: 844,
        deviceScaleFactor: 3,
        isMobile: true,
        description: 'iPhone 14/15 Pro, portrait',
    },
    'iphone-landscape': {
        width: 844,
        height: 390,
        deviceScaleFactor: 3,
        isMobile: true,
        description: 'iPhone 14/15 Pro, landscape',
    },
};

export const VIEWPORT_NAMES = Object.keys(VIEWPORTS);
