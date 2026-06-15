import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the data layer before importing the model under test. The calendar
// admin read path pulls the curated activeLeagueSchedule + trackDisplayInfo
// through fetch-util; these tests pin down how it degrades when a brand-new
// season has not yet propagated into the curated schedule (the transitional
// state where the page used to render blank AND lose its track picker).
vi.mock('@@/src/utils/fetch-util', () => ({
    getCuratedActiveLeagueSchedule: vi.fn(),
    getCuratedTrackDisplayInfo: vi.fn(),
    crtSchedEvent: vi.fn(),
    updSchedEvent: vi.fn(),
    delSchedEvent: vi.fn(),
}));

import {
    getCuratedActiveLeagueSchedule,
    getCuratedTrackDisplayInfo,
} from '@@/src/utils/fetch-util';
import { getCdrAdminModel } from './season-cdr-admin-model';

const scheduleMock = vi.mocked(getCuratedActiveLeagueSchedule);
const tracksMock = vi.mocked(getCuratedTrackDisplayInfo);

const TRACKS = {
    '18': { display: 'Watkins Glen' },
    '5': { display: 'Spa' },
};

function scheduleWithSeasons(seasons: unknown[]) {
    return {
        leagues: [{ league_id: 4534, seasons }],
    } as unknown as Awaited<ReturnType<typeof getCuratedActiveLeagueSchedule>>;
}

describe('getCdrAdminModel — transitional-state resilience', () => {
    beforeEach(() => {
        scheduleMock.mockReset();
        tracksMock.mockReset();
        tracksMock.mockResolvedValue(
            TRACKS as unknown as Awaited<
                ReturnType<typeof getCuratedTrackDisplayInfo>
            >
        );
    });

    it('populates the track picker even when the season is absent from the curated schedule', async () => {
        // Brand-new season 131502 not yet in the curated schedule.
        scheduleMock.mockResolvedValue(
            scheduleWithSeasons([{ season_id: 105035, car_id: 1, events: [] }])
        );

        const model = await getCdrAdminModel('4534', '131502');

        // Empty calendar (nothing scheduled yet) ...
        expect(model.events).toEqual([]);
        // ... but the admin can still add events: tracks are loaded + sorted.
        expect(model.tracks).toHaveLength(2);
        expect(model.tracks[0].name).toBe('Spa');
        expect(model.tracks[1].name).toBe('Watkins Glen');
    });

    it('still loads tracks when the whole league is missing from the schedule', async () => {
        scheduleMock.mockResolvedValue({
            leagues: [{ league_id: 9999, seasons: [] }],
        } as unknown as Awaited<ReturnType<typeof getCuratedActiveLeagueSchedule>>);

        const model = await getCdrAdminModel('4534', '131502');

        expect(model.events).toEqual([]);
        expect(model.tracks).toHaveLength(2);
    });

    it('maps events with resolved track names once the season has propagated', async () => {
        scheduleMock.mockResolvedValue(
            scheduleWithSeasons([
                {
                    season_id: 131502,
                    car_id: 2,
                    events: [
                        {
                            track_id: 18,
                            time: '2026-07-01T00:00:00.000Z',
                            event_id: 'ev1',
                        },
                    ],
                },
            ])
        );

        const model = await getCdrAdminModel('4534', '131502');

        expect(model.events).toHaveLength(1);
        expect(model.events[0].trackDisplayName).toBe('Watkins Glen');
        expect(model.events[0].trackId).toBe(18);
        expect(model.events[0].eventId).toBe('ev1');
        expect(model.tracks).toHaveLength(2);
    });

    it('does not throw when an event references a track missing from trackDisplayInfo', async () => {
        scheduleMock.mockResolvedValue(
            scheduleWithSeasons([
                {
                    season_id: 131502,
                    car_id: 2,
                    events: [
                        {
                            track_id: 99999,
                            time: '2026-07-01T00:00:00.000Z',
                            event_id: 'ev1',
                        },
                    ],
                },
            ])
        );

        const model = await getCdrAdminModel('4534', '131502');

        expect(model.events).toHaveLength(1);
        expect(model.events[0].trackDisplayName).toBe('');
        expect(model.events[0].trackId).toBe(99999);
    });

    it('surfaces events even when track display info is unavailable', async () => {
        tracksMock.mockResolvedValue(null);
        scheduleMock.mockResolvedValue(
            scheduleWithSeasons([
                {
                    season_id: 131502,
                    car_id: 2,
                    events: [
                        {
                            track_id: 18,
                            time: '2026-07-01T00:00:00.000Z',
                            event_id: 'ev1',
                        },
                    ],
                },
            ])
        );

        const model = await getCdrAdminModel('4534', '131502');

        expect(model.tracks).toEqual([]);
        expect(model.events).toHaveLength(1);
        expect(model.events[0].trackDisplayName).toBe('');
        expect(model.events[0].trackId).toBe(18);
    });
});
