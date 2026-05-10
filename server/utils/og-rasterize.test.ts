import { describe, it, expect } from 'vitest';
import { rasterizeSvgWithFonts } from './og-rasterize';
import { OG_FONT_BUFFERS } from './og-fonts-data';
import {
    renderCardShell,
    renderBodyRow,
    podiumBadge,
} from './og-render-shared';

/**
 * Regression coverage for the bug that shipped a "shapes but no
 * glyphs" PNG to Discord: resvg silently dropped every text node when
 * it couldn't resolve `ui-sans-serif`/`system-ui`/`sans-serif` to a
 * real font on Vercel's serverless runtime. These tests would have
 * failed in CI before that change reached production.
 */

const PNG_SIGNATURE = '89504e470d0a1a0a';

describe('rasterizeSvgWithFonts', () => {
    it('produces a valid PNG with the bundled Inter fonts', async () => {
        const fonts = OG_FONT_BUFFERS;
        const svg = renderCardShell({
            eyebrow: 'LEAP · RACE RESULTS',
            title: 'St. Petersburg Grand Prix',
            subtitle: 'Subsession 85228727 · Simsession 0',
            bodySvg: [1, 2, 3]
                .map((p) =>
                    renderBodyRow({
                        y: 240 + (p - 1) * 58,
                        label: `Driver ${p}`,
                        valueLeft: p === 1 ? 'leader' : `+${p}.000s`,
                        valueRight: `${30 - p * 5} pts`,
                        badge: { text: String(p), ...podiumBadge(p) },
                    })
                )
                .join('\n'),
        });
        const png = await rasterizeSvgWithFonts(svg, fonts);

        expect(png.slice(0, 8).toString('hex')).toBe(PNG_SIGNATURE);
        // Empirically a typical card with text runs ~30-150KB. The
        // shapes-only fallback that shipped to prod was ~15KB. Use
        // 25KB as the "text definitely rendered" threshold.
        expect(png.length).toBeGreaterThan(25_000);
    });

    it('rendering text doubles the output size vs. shapes-only', async () => {
        // Sanity check that text rendering meaningfully contributes to
        // the byte stream. A regression where fonts silently disappear
        // again would close this gap.
        const fonts = OG_FONT_BUFFERS;
        const withText = renderCardShell({
            eyebrow: 'LEAP',
            title: 'A long enough headline to render many glyphs here',
            subtitle:
                'A descriptive subtitle with several words and numbers 12345',
            bodySvg: '',
        });
        const shapesOnly = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0b0d10"/>
  <rect x="0" y="0" width="1200" height="6" fill="#2f81f7"/>
</svg>`;

        const a = await rasterizeSvgWithFonts(withText, fonts);
        const b = await rasterizeSvgWithFonts(shapesOnly, fonts);

        expect(a.length).toBeGreaterThan(b.length * 2);
    });
});
