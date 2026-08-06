/**
 * Tripwire for a local divergence in a vendored file.
 *
 * `lplib/dtbrkr/dtlkdata.ts` carries a `SCOPE_PARAMS` whitelist that decides
 * which query keys reach the broker. It is a rewritten HTTP shim, not upstream
 * lplib-dtbrkr, and `lplib-pull.sh` deletes the whole directory before copying
 * upstream over it — so the local `'class'` addition is one `./lplib-pull.sh`
 * away from vanishing.
 *
 * Losing it fails silently: `ldata-srhweb/seasonStandings` 404s, the standings
 * model reads that as "this league has no srhweb data", and the page quietly
 * falls back to the computed standings. Nothing throws and nothing logs.
 *
 * This test lives under `server/` on purpose. `vitest.config.ts` includes
 * `server/**` in the unit suite and never includes `lplib/**`, and the pull
 * script cannot delete anything outside `lplib/dtbrkr` and
 * `lplib/endpoint-types`. See lplib/README-DIVERGENCE.md.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { getDocument } from '@@/lplib/dtbrkr/dtlkdata';

let lastUrl = '';

beforeEach(() => {
    lastUrl = '';
    vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string) => {
            lastUrl = String(url);
            return { ok: true, json: async () => ({ ok: true }) };
        })
    );
    // The module logs every outbound URL; keep the suite output readable.
    vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

function queryOf(url: string): URLSearchParams {
    return new URL(url).searchParams;
}

describe('dtlkdata SCOPE_PARAMS', () => {
    it('forwards `class` — required by ldata-srhweb/seasonStandings', async () => {
        await getDocument({
            namespace: 'ldata-srhweb',
            type: 'seasonStandings',
            league: '4534',
            season: '134456',
            class: '0',
        });

        expect(
            queryOf(lastUrl).get('class'),
            'SCOPE_PARAMS lost `class` — most likely lplib-pull.sh overwrote ' +
                'lplib/dtbrkr/dtlkdata.ts. Re-apply per lplib/README-DIVERGENCE.md.'
        ).toBe('0');
    });

    // class 0 is the synthetic single-class case and by far the most common
    // standings query, so it has to survive the whitelist's empty-value filter
    // in both the string and numeric forms.
    it('does not drop class 0 as if it were empty', async () => {
        await getDocument({
            namespace: 'ldata-srhweb',
            type: 'seasonStandings',
            league: 4534,
            season: 134456,
            class: 0,
        });

        expect(queryOf(lastUrl).get('class')).toBe('0');
    });

    it('still forwards the pre-existing scope params', async () => {
        await getDocument({
            namespace: 'ldata-rsltsts',
            type: 'driverSessionResults',
            league: '4534',
            sessionType: 'race',
            custId: '555362',
        });

        const q = queryOf(lastUrl);
        expect(q.get('league')).toBe('4534');
        expect(q.get('sessionType')).toBe('race');
        expect(q.get('custId')).toBe('555362');
    });

    // Negative simsession numbers address heats. The `n2` spelling is the
    // broker's on-disk filename encoding, not a query value — the signed
    // integer has to survive intact.
    it('forwards a negative simsession unchanged', async () => {
        await getDocument({
            namespace: 'ldata-srhweb',
            type: 'raceResults',
            subsession: 86551649,
            simsession: -2,
        });

        expect(queryOf(lastUrl).get('simsession')).toBe('-2');
    });

    it('omits keys that are absent or empty', async () => {
        await getDocument({
            namespace: 'ldata-srhweb',
            type: 'seasonInfo',
            league: '4534',
            season: '134456',
            class: '',
        });

        const q = queryOf(lastUrl);
        expect(q.has('class')).toBe(false);
        expect(q.has('subsession')).toBe(false);
    });

    it('targets the datalake route on the broker', async () => {
        await getDocument({
            namespace: 'ldata-srhweb',
            type: 'seasonInfo',
            league: '4534',
            season: '134456',
        });

        expect(lastUrl).toContain('/datalake/ldata-srhweb/seasonInfo');
    });
});
