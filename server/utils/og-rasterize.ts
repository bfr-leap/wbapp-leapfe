/**
 * SVG → PNG rasterization for `/api/og`.
 *
 * Discord, Twitter/X, LinkedIn, and several other unfurlers reject
 * `image/svg+xml` in `og:image` (security: SVG can carry script). They
 * silently fall back to a placeholder, which is what users were seeing.
 * Every per-mode card builder still produces SVG — that's by far the
 * easiest layout primitive — and this module turns the result into the
 * PNG bytes the unfurlers actually accept.
 *
 * Fonts must be bundled, not borrowed. Vercel's serverless runtime
 * ships without Western fonts, so resvg's `loadSystemFonts` finds
 * nothing on production even though it works fine on a developer Mac
 * or our Linux dev sandbox. The result is a card with shapes but no
 * glyphs (badges visible, names invisible).
 *
 * We tried `useStorage('assets:server')` against `server/assets/*.woff2`
 * first; in dev that works, but Nitro's production bundling on Vercel
 * doesn't reliably inline binary server assets, and `getItemRaw`
 * returns null in the deployed function. To sidestep that entirely we
 * base64-inline the three Inter weights into `og-fonts-data.ts` so
 * the fonts ride the JS bundle wherever it goes — dev, build, Vercel,
 * or anywhere else Nitro can run.
 */

import { OG_FONT_BUFFERS } from './og-fonts-data';

export const PNG_WIDTH = 1200;

/**
 * Pure rasterization step — no I/O. Tests and the CLI preview script
 * exercise the same rendering path the request handler uses without
 * bringing up a server.
 */
export async function rasterizeSvgWithFonts(
    svg: string,
    fontBuffers: Buffer[]
): Promise<Buffer> {
    const { Resvg } = await import('@resvg/resvg-js');
    const resvg = new Resvg(svg, {
        fitTo: { mode: 'width', value: PNG_WIDTH },
        font: {
            fontBuffers,
            // Disable system-font lookup so dev (Linux + DejaVu) and
            // production (Vercel + nothing) render identically.
            loadSystemFonts: false,
            // Our SVGs use `font-family="ui-sans-serif, system-ui,
            // sans-serif"` to match the SPA's CSS. resvg can't resolve
            // those CSS keywords on its own, so the bundled face below
            // becomes the actual font for every text node.
            defaultFontFamily: 'Inter',
        },
        background: '#0b0d10',
    });
    return resvg.render().asPng();
}

export async function rasterizeSvgToPng(svg: string): Promise<Buffer> {
    return rasterizeSvgWithFonts(svg, OG_FONT_BUFFERS);
}
