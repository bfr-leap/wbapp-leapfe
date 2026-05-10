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
 * `@resvg/resvg-js` is a Rust-backed rasterizer with prebuilt native
 * binaries; on Vercel's Linux runtime it picks up DejaVu Sans (and
 * friends) as the default sans-serif fallback, which is good enough for
 * the headline / row text we render. If a host ever lacks system fonts,
 * `defaultFontFamily` keeps text legible by falling through to whatever
 * resvg can find rather than dropping glyphs.
 */

export const PNG_WIDTH = 1200;

export async function rasterizeSvgToPng(svg: string): Promise<Buffer> {
    // Lazy import keeps the native binding out of the cold-start path
    // for any handler that doesn't need it (and out of test bundles
    // that don't touch this endpoint).
    const { Resvg } = await import('@resvg/resvg-js');
    const resvg = new Resvg(svg, {
        fitTo: { mode: 'width', value: PNG_WIDTH },
        font: {
            loadSystemFonts: true,
            defaultFontFamily: 'sans-serif',
        },
        background: '#0b0d10',
    });
    return resvg.render().asPng();
}
