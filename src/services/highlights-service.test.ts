import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@@/src/utils/api-client', () => ({
    fetchJsonPath: vi.fn(),
}));

import { fetchJsonPath } from '@@/src/utils/api-client';
import {
    getHighlightsForSubsession,
    getHighlightsForDriver,
    highlightImageUrl,
} from './highlights-service';
import type { HighlightEntry } from '@@/lplib/endpoint-types/trkcam-endpoints';

const fetchMock = vi.mocked(fetchJsonPath);

const SAMPLE: HighlightEntry = {
    subsession_id: 87426864,
    frame: 199243,
    driver_user_id: 879688,
    category: 'overtakes',
    file: '87426864_199243_879688.png',
};

describe('getHighlightsForSubsession', () => {
    beforeEach(() => {
        fetchMock.mockReset();
    });

    it('returns [] without fetching when subsessionId is empty', async () => {
        const out = await getHighlightsForSubsession('');
        expect(out).toEqual([]);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('requests the subsession index path with no category filter', async () => {
        fetchMock.mockResolvedValueOnce([SAMPLE]);
        const out = await getHighlightsForSubsession('87426864');
        expect(fetchMock).toHaveBeenCalledWith(
            '/api/trkcam/highlights/87426864'
        );
        expect(out).toEqual([SAMPLE]);
    });

    it('appends the category query when supplied', async () => {
        fetchMock.mockResolvedValueOnce([SAMPLE]);
        await getHighlightsForSubsession('87426864', 'overtakes');
        expect(fetchMock).toHaveBeenCalledWith(
            '/api/trkcam/highlights/87426864?category=overtakes'
        );
    });

    it('returns [] when the broker call fails (null)', async () => {
        fetchMock.mockResolvedValueOnce(null);
        const out = await getHighlightsForSubsession('87426864');
        expect(out).toEqual([]);
    });

    it('returns [] when the response is not an array (error envelope)', async () => {
        fetchMock.mockResolvedValueOnce({
            error: 'Invalid subsession ID',
        } as unknown as HighlightEntry[]);
        const out = await getHighlightsForSubsession('87426864');
        expect(out).toEqual([]);
    });
});

describe('getHighlightsForDriver', () => {
    beforeEach(() => {
        fetchMock.mockReset();
    });

    it('returns [] without fetching when custId is empty', async () => {
        const out = await getHighlightsForDriver('');
        expect(out).toEqual([]);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('requests the driver index path', async () => {
        fetchMock.mockResolvedValueOnce([SAMPLE]);
        const out = await getHighlightsForDriver('879688');
        expect(fetchMock).toHaveBeenCalledWith(
            '/api/trkcam/highlights/driver/879688'
        );
        expect(out).toEqual([SAMPLE]);
    });
});

describe('highlightImageUrl', () => {
    it('builds the category-qualified image path', () => {
        expect(highlightImageUrl(SAMPLE)).toBe(
            '/api/trkcam/highlight/overtakes/87426864_199243_879688.png'
        );
    });
});
