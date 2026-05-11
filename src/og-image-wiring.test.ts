/**
 * Static checks that the OG image wiring stays load-bearing.
 *
 * These aren't end-to-end renders (the smoke suite covers what it
 * can without a real Clerk dev key), but they catch the two
 * regression classes we've actually shipped:
 *
 *  - The Card template file gets renamed or moved out from under
 *    `nuxt-og-image`'s component registry. `componentDirs: ['LeapOg']`
 *    in `nuxt.config.ts` makes the module scan `components/LeapOg/`
 *    and register files there under their bare name. If the file
 *    drifts back to a flat `components/LeapOgCard.vue` (which Nuxt
 *    happily auto-imports as `<LeapOgCard>` but the og-image module
 *    never sees), `defineOgImage('Card', …)` resolves to a missing
 *    component and the module silently falls back to its built-in
 *    default. The Vercel preview then renders a generic "Live Event
 *    Analysis and Performance" card instead of our per-page Card.
 *
 *  - `nuxt.config.ts` drops `'LeapOg'` out of `ogImage.componentDirs`.
 *    Same end state as above — the module scans a different set of
 *    dirs and our template never registers.
 *
 * Both are config-shaped problems that don't surface in a runtime
 * smoke test (the page still emits an `og:image` meta + the
 * `#nuxt-og-image-options` marker; only the actual PNG render
 * falls back). Easier to assert statically.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(__dirname, '..');

describe('OG image wiring (static)', () => {
    it('Card template lives at components/LeapOg/Card.vue', () => {
        const cardPath = resolve(repoRoot, 'components/LeapOg/Card.vue');
        expect(
            existsSync(cardPath),
            `Expected the Card template at ${cardPath}. nuxt-og-image's ` +
                `componentDirs option scans \`components/LeapOg/\` and ` +
                `strips that dir prefix to register the file as \`<Card>\` ` +
                `for \`defineOgImage('Card', …)\`. A flat ` +
                `\`components/LeapOgCard.vue\` does NOT work — Nuxt's ` +
                `auto-importer registers it under a different name and ` +
                `the og-image module's template lookup misses it, ` +
                `falling back to the built-in default card on every ` +
                `Discord unfurl.`
        ).toBe(true);
    });

    it('the Card template has a recognisable LEAP footer (so smoke can fingerprint it)', () => {
        const cardPath = resolve(repoRoot, 'components/LeapOg/Card.vue');
        const source = readFileSync(cardPath, 'utf-8');
        expect(source).toContain('bluefrogracing.com');
    });

    it('nuxt.config.ts keeps `LeapOg` in ogImage.componentDirs', () => {
        const config = readFileSync(
            resolve(repoRoot, 'nuxt.config.ts'),
            'utf-8'
        );
        const dirsMatch = config.match(/componentDirs:\s*\[([^\]]+)\]/);
        expect(
            dirsMatch,
            'nuxt.config.ts no longer declares `ogImage.componentDirs` — ' +
                'the og-image module needs to know `components/LeapOg/` ' +
                'is a template directory or it will skip our Card.'
        ).toBeTruthy();
        const dirsList = dirsMatch![1];
        expect(
            dirsList,
            "`ogImage.componentDirs` no longer includes 'LeapOg'. The " +
                'og-image module will skip our Card template and unfurlers ' +
                'will get the built-in default card. Add `LeapOg` back ' +
                "(the `OgImage` namespace is reserved by the module's own " +
                'runtime, hence the `LeapOg` prefix).'
        ).toMatch(/['"]LeapOg['"]/);
    });

    it('pages/index.vue calls defineOgImage unconditionally so the marker ships even when /api/og-payload fails', () => {
        const page = readFileSync(
            resolve(repoRoot, 'pages/index.vue'),
            'utf-8'
        );
        // Crude but effective: `defineOgImage` must not be the
        // syntactic child of an `if (ogPayload.value)` block. We
        // look for the marker comment we wrote next to the call.
        // If you refactor that comment away, please update this
        // test along with it.
        expect(
            page,
            "`pages/index.vue` should always call `defineOgImage('Card', …)` " +
                'so the page emits the `#nuxt-og-image-options` marker even ' +
                'when /api/og-payload fails. Without that marker the ' +
                'og-image module crashes with "Failed to read the path …" ' +
                'on every Discord unfurl.'
        ).toMatch(/defineOgImage\(['"]Card['"],\s*ogPayload\.value\?\.card/);
    });
});
