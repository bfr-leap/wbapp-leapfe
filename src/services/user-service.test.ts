import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the api-client module BEFORE importing the service under test.
// `getUserLeaguesState` and `getUserFeatures` both go through
// `fetchUncached`, which under SSR can return `null`, an empty
// object, or an error envelope when there's no auth token. The
// service-layer's job is to coerce those to safe defaults so render
// code that does `.findIndex` / `.length` doesn't crash mid-SSR.
vi.mock('@@/src/utils/api-client', () => ({
    fetchUncached: vi.fn(),
}));

import { fetchUncached } from '@@/src/utils/api-client';
import { getUserLeaguesState } from './user-service';

const fetchMock = vi.mocked(fetchUncached);

describe('getUserLeaguesState — SSR-safe coercion', () => {
    beforeEach(() => {
        fetchMock.mockReset();
    });
    afterEach(async () => {
        // Drain the in-flight cache the service keeps so each test
        // hits its own mocked response.
        await new Promise((resolve) => setTimeout(resolve, 1600));
    });

    it('returns the array from the broker when valid', async () => {
        fetchMock.mockResolvedValueOnce([
            { league_id: 1, name: 'L', short_name: 'L' },
        ]);
        const out = await getUserLeaguesState();
        expect(Array.isArray(out)).toBe(true);
        expect(out).toHaveLength(1);
    });

    it('returns [] when the broker returns null', async () => {
        // The broker hands back null for anonymous (unauthenticated)
        // requests — common during SSR before any user signs in.
        // Without coercion, downstream `.findIndex` / `.length`
        // crashes the SSR render and the page 500s.
        fetchMock.mockResolvedValueOnce(null);
        const out = await getUserLeaguesState();
        expect(out).toEqual([]);
    });

    it('returns [] when the broker returns an error envelope', async () => {
        fetchMock.mockResolvedValueOnce({
            message: 'unauthorized',
        } as unknown as never);
        const out = await getUserLeaguesState();
        expect(out).toEqual([]);
    });

    it('returns [] when the broker returns undefined', async () => {
        fetchMock.mockResolvedValueOnce(undefined as unknown as never);
        const out = await getUserLeaguesState();
        expect(out).toEqual([]);
    });
});
