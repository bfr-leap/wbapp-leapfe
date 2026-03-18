import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    getPastEventCardsModel,
    getDefaultPastEventCardsModel,
} from './past-events-cards-model';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@@/src/utils/fetch-util', () => ({
    getLeagueSeasonSessions: vi.fn(),
    getLeagueSimsessionIndex: vi.fn(),
}));

import {
    getLeagueSeasonSessions,
    getLeagueSimsessionIndex,
} from '@@/src/utils/fetch-util';

const mockGetLeagueSeasonSessions = vi.mocked(getLeagueSeasonSessions);
const mockGetLeagueSimsessionIndex = vi.mocked(getLeagueSimsessionIndex);

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const LEAGUE = '1234';
const SEASON = '5678';

function makeSessions() {
    return {
        sessions: [
            {
                subsession_id: 100,
                session_id: 10,
                launch_at: '2025-01-15T20:00:00Z',
                track: { track_id: 301, track_name: 'Daytona' },
                has_results: true,
            },
            {
                subsession_id: 200,
                session_id: 20,
                launch_at: '2025-01-22T20:00:00Z',
                track: { track_id: 302, track_name: 'Spa' },
                has_results: true,
            },
        ],
        success: true,
        season_id: 5678,
        league_id: 1234,
    };
}

function makeSimsessionIndex() {
    return [
        {
            season_id: 5678,
            season_title: 'Season 1',
            sessions: [
                {
                    session_id: 10,
                    subsession_id: 100,
                    session_title: 'Race 1',
                    simsessions: [
                        { simsession_id: 0, type: 'qualify' as const },
                        { simsession_id: 1, type: 'race' as const },
                    ],
                },
                {
                    session_id: 20,
                    subsession_id: 200,
                    session_title: 'Race 2',
                    simsessions: [
                        { simsession_id: 0, type: 'qualify' as const },
                        { simsession_id: 1, type: 'race' as const },
                        { simsession_id: 2, type: 'sprint' as const },
                    ],
                },
            ],
        },
    ];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getDefaultPastEventCardsModel', () => {
    it('returns empty pastRaces array', () => {
        const model = getDefaultPastEventCardsModel();
        expect(model.pastRaces).toEqual([]);
    });
});

describe('getPastEventCardsModel', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('returns empty model when league is empty', async () => {
        const model = await getPastEventCardsModel('', SEASON);
        expect(model.pastRaces).toEqual([]);
        expect(mockGetLeagueSeasonSessions).not.toHaveBeenCalled();
    });

    it('returns empty model when season is empty', async () => {
        const model = await getPastEventCardsModel(LEAGUE, '');
        expect(model.pastRaces).toEqual([]);
        expect(mockGetLeagueSeasonSessions).not.toHaveBeenCalled();
    });

    it('maps session data correctly', async () => {
        mockGetLeagueSeasonSessions.mockResolvedValue(
            makeSessions() as any
        );
        mockGetLeagueSimsessionIndex.mockResolvedValue(
            makeSimsessionIndex() as any
        );

        const model = await getPastEventCardsModel(LEAGUE, SEASON);

        expect(model.pastRaces).toHaveLength(2);
        expect(model.pastRaces[0].trackId).toBe('301');
        expect(model.pastRaces[0].sessionId).toBe('100');
        expect(model.pastRaces[1].trackId).toBe('302');
        expect(model.pastRaces[1].sessionId).toBe('200');
    });

    it('includes the correct first race simsession ID for each event', async () => {
        mockGetLeagueSeasonSessions.mockResolvedValue(
            makeSessions() as any
        );
        mockGetLeagueSimsessionIndex.mockResolvedValue(
            makeSimsessionIndex() as any
        );

        const model = await getPastEventCardsModel(LEAGUE, SEASON);

        // Both sessions have qualify (id=0) then race (id=1).
        // The first *race* simsession should be selected, not hardcoded 0.
        expect(model.pastRaces[0].simsessionId).toBe('1');
        expect(model.pastRaces[1].simsessionId).toBe('1');
    });

    it('falls back to first simsession when no race type exists', async () => {
        const simsessionIndex = makeSimsessionIndex();
        // Make first session have only qualify simsessions
        simsessionIndex[0].sessions[0].simsessions = [
            { simsession_id: 0, type: 'qualify' as const },
        ];

        mockGetLeagueSeasonSessions.mockResolvedValue(
            makeSessions() as any
        );
        mockGetLeagueSimsessionIndex.mockResolvedValue(
            simsessionIndex as any
        );

        const model = await getPastEventCardsModel(LEAGUE, SEASON);

        // Should fall back to the first simsession (id=0)
        expect(model.pastRaces[0].simsessionId).toBe('0');
    });

    it('returns empty simsessionId when simsession index has no matching session', async () => {
        const simsessionIndex = makeSimsessionIndex();
        // Remove all sessions from the index
        simsessionIndex[0].sessions = [];

        mockGetLeagueSeasonSessions.mockResolvedValue(
            makeSessions() as any
        );
        mockGetLeagueSimsessionIndex.mockResolvedValue(
            simsessionIndex as any
        );

        const model = await getPastEventCardsModel(LEAGUE, SEASON);

        expect(model.pastRaces[0].simsessionId).toBe('');
        expect(model.pastRaces[1].simsessionId).toBe('');
    });
});
