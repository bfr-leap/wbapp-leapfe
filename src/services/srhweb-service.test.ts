import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the api-client BEFORE importing the service. What matters at this
// layer is the query each accessor composes — the shapes it forwards are
// exactly the ones the broker's `ldata-srhweb` resolver keys off, and two of
// them (`class`, and a signed `simsession`) are easy to get subtly wrong in a
// way that 404s instead of erroring.
vi.mock('@@/src/utils/api-client', () => ({
    fetchCachedDocument: vi.fn(),
}));

import { fetchCachedDocument } from '@@/src/utils/api-client';
import {
    getSrhSeasonInfo,
    getSrhSeasonStandings,
    getSrhRaceResults,
    getSrhRaceAdjudications,
} from './srhweb-service';

const fetchMock = vi.mocked(fetchCachedDocument);

beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(null as any);
});

function lastQuery(): Record<string, unknown> {
    return fetchMock.mock.calls.at(-1)![0] as Record<string, unknown>;
}

describe('getSrhSeasonInfo', () => {
    it('queries the seasonInfo type by league and season', async () => {
        await getSrhSeasonInfo('4534', '134456');

        expect(lastQuery()).toEqual({
            namespace: 'ldata-srhweb',
            type: 'seasonInfo',
            league: '4534',
            season: '134456',
        });
    });

    it('returns null for a league with no srhweb coverage', async () => {
        fetchMock.mockResolvedValue(null as any);
        expect(await getSrhSeasonInfo('6555', '99410')).toBeNull();
    });
});

describe('getSrhSeasonStandings', () => {
    // Single-class seasons carry the synthetic class 0. Sent as a number it
    // would be at the mercy of every truthiness filter between here and the
    // broker; sent as '0' it survives them all.
    it('sends class 0 as a string rather than dropping it', async () => {
        await getSrhSeasonStandings('4534', '134456', 0);

        expect(lastQuery()).toEqual({
            namespace: 'ldata-srhweb',
            type: 'seasonStandings',
            league: '4534',
            season: '134456',
            class: '0',
        });
    });

    it('accepts a class id already given as a string', async () => {
        await getSrhSeasonStandings('4534', '134456', '2');
        expect(lastQuery().class).toBe('2');
    });
});

describe('getSrhRaceResults', () => {
    it('sends the closing race as simsession 0', async () => {
        await getSrhRaceResults(86551649, 0);

        expect(lastQuery()).toEqual({
            namespace: 'ldata-srhweb',
            type: 'raceResults',
            subsession: '86551649',
            simsession: '0',
        });
    });

    // Heats score championship points at negative session numbers. The `n2`
    // spelling is the broker's on-disk filename encoding and 404s as a query
    // value, so the signed integer has to survive intact.
    it('sends a heat as a signed negative simsession, not n2', async () => {
        await getSrhRaceResults(86551649, -2);

        const q = lastQuery();
        expect(q.simsession).toBe('-2');
        expect(q.simsession).not.toBe('n2');
    });
});

describe('getSrhRaceAdjudications', () => {
    it('queries by subsession and simsession', async () => {
        await getSrhRaceAdjudications(86551649, -2);

        expect(lastQuery()).toEqual({
            namespace: 'ldata-srhweb',
            type: 'raceAdjudications',
            subsession: '86551649',
            simsession: '-2',
        });
    });

    // Two empty lists is a real document — most races are scored without
    // steward intervention. The service must pass it through rather than
    // collapsing it to null alongside a genuine miss.
    it('passes through a document with no adjustments', async () => {
        const empty = {
            subsession_id: 86551649,
            simsession_number: 0,
            penalties: [],
            bonuses: [],
        };
        fetchMock.mockResolvedValue(empty as any);

        expect(await getSrhRaceAdjudications(86551649, 0)).toBe(empty);
    });
});
