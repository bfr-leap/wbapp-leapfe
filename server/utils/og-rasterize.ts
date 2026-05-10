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
 * glyphs (badges visible, names invisible). We vendor a few weights
 * of Inter as WOFF2 in `server/assets/` and pass them to resvg as
 * explicit `fontBuffers`. Nitro auto-registers that directory under
 * the `assets:server` storage namespace, so the same code path works
 * in dev, in `nuxt build`, and on Vercel.
 */

export const PNG_WIDTH = 1200;

export const OG_FONT_FILES = [
    'og-font-400.woff2',
    'og-font-600.woff2',
    'og-font-700.woff2',
] as const;

let cachedFontBuffers: Buffer[] | null = null;

async function loadFontBuffers(): Promise<Buffer[]> {
    if (cachedFontBuffers) return cachedFontBuffers;
    const storage = useStorage('assets:server');
    const buffers = await Promise.all(
        OG_FONT_FILES.map(
            (n) => storage.getItemRaw(n) as Promise<Buffer | null>
        )
    );
    const ok = buffers.filter((b): b is Buffer => b != null);
    if (ok.length === 0) {
        throw new Error(
            'OG fonts missing — expected server/assets/og-font-{400,600,700}.woff2'
        );
    }
    cachedFontBuffers = ok;
    return ok;
}

/**
 * Pure rasterization step — no Nitro context, no I/O. Tests and the
 * CLI preview script feed the WOFF2 buffers in directly so they can
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
    const fontBuffers = await loadFontBuffers();
    return rasterizeSvgWithFonts(svg, fontBuffers);
}
