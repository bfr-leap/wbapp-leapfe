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
    getDriverResults: vi.fn(),
    getGeneratedSimsessionSummary: vi.fn(),
}));

import {
    getLeagueSeasonSessions,
    getLeagueSimsessionIndex,
    getDriverResults,
    getGeneratedSimsessionSummary,
} from '@@/src/utils/fetch-util';

const mockGetLeagueSeasonSessions = vi.mocked(getLeagueSeasonSessions);
const mockGetLeagueSimsessionIndex = vi.mocked(getLeagueSimsessionIndex);
const mockGetDriverResults = vi.mocked(getDriverResults);
const mockGetGeneratedSimsessionSummary = vi.mocked(
    getGeneratedSimsessionSummary
);

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
                winner_id: 9001,
                winner_name: 'Adam Merchant',
            },
            {
                subsession_id: 200,
                session_id: 20,
                launch_at: '2025-01-22T20:00:00Z',
                track: { track_id: 302, track_name: 'Spa' },
                has_results: true,
                winner_id: 9002,
                winner_name: 'Elliot Cawte',
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
        // Default to no summary — individual tests opt in.
        mockGetGeneratedSimsessionSummary.mockResolvedValue(null);
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
        mockGetLeagueSeasonSessions.mockResolvedValue(makeSessions() as any);
        mockGetLeagueSimsessionIndex.mockResolvedValue(
            makeSimsessionIndex() as any
        );

        const model = await getPastEventCardsModel(LEAGUE, SEASON);

        // Sessions arrive ascending by date; the model reverses so the
        // most recent (subsession 200, Jan 22) is the head of the list.
        expect(model.pastRaces).toHaveLength(2);
        expect(model.pastRaces[0].trackId).toBe('302');
        expect(model.pastRaces[0].sessionId).toBe('200');
        expect(model.pastRaces[1].trackId).toBe('301');
        expect(model.pastRaces[1].sessionId).toBe('100');
    });

    it('orders races from newest to oldest', async () => {
        // Feed the input deliberately out-of-order to prove the model
        // sorts on date, not just reverses the input.
        const sessions = makeSessions();
        sessions.sessions = [
            {
                subsession_id: 100,
                session_id: 10,
                launch_at: '2025-01-15T20:00:00Z',
                track: { track_id: 301, track_name: 'Daytona' },
                has_results: true,
                winner_id: 9001,
                winner_name: 'Adam Merchant',
            } as any,
            {
                subsession_id: 300,
                session_id: 30,
                launch_at: '2025-02-05T20:00:00Z',
                track: { track_id: 303, track_name: 'Monza' },
                has_results: true,
                winner_id: 9003,
                winner_name: 'Leo Delmas',
            } as any,
            {
                subsession_id: 200,
                session_id: 20,
                launch_at: '2025-01-22T20:00:00Z',
                track: { track_id: 302, track_name: 'Spa' },
                has_results: true,
                winner_id: 9002,
                winner_name: 'Elliot Cawte',
            } as any,
        ];
        mockGetLeagueSeasonSessions.mockResolvedValue(sessions as any);
        mockGetLeagueSimsessionIndex.mockResolvedValue(
            makeSimsessionIndex() as any
        );

        const model = await getPastEventCardsModel(LEAGUE, SEASON);

        expect(model.pastRaces.map((r) => r.sessionId)).toEqual([
            '300',
            '200',
            '100',
        ]);
    });

    it('includes the correct first race simsession ID for each event', async () => {
        mockGetLeagueSeasonSessions.mockResolvedValue(makeSessions() as any);
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

        mockGetLeagueSeasonSessions.mockResolvedValue(makeSessions() as any);
        mockGetLeagueSimsessionIndex.mockResolvedValue(simsessionIndex as any);

        const model = await getPastEventCardsModel(LEAGUE, SEASON);

        // Should fall back to the first simsession (id=0). The test
        // modifies the *first* input session (subsession 100), which
        // ends up at pastRaces[1] after the newest-first sort.
        expect(model.pastRaces[1].simsessionId).toBe('0');
    });

    it('returns empty simsessionId when simsession index has no matching session', async () => {
        const simsessionIndex = makeSimsessionIndex();
        // Remove all sessions from the index
        simsessionIndex[0].sessions = [];

        mockGetLeagueSeasonSessions.mockResolvedValue(makeSessions() as any);
        mockGetLeagueSimsessionIndex.mockResolvedValue(simsessionIndex as any);

        const model = await getPastEventCardsModel(LEAGUE, SEASON);

        expect(model.pastRaces[0].simsessionId).toBe('');
        expect(model.pastRaces[1].simsessionId).toBe('');
    });

    it('augments pastRaces with protagonist finish/start when irCustId provided', async () => {
        mockGetLeagueSeasonSessions.mockResolvedValue(makeSessions() as any);
        mockGetLeagueSimsessionIndex.mockResolvedValue(
            makeSimsessionIndex() as any
        );
        // DriverResults shape: { [season]: { [subsession]: SSR_ResultsEntry } }
        mockGetDriverResults.mockResolvedValue({
            5678: {
                100: { position: 5, start_position: 8 } as any,
                // subsession 200 intentionally missing — simulates a DNS/skip
            },
        } as any);

        const model = await getPastEventCardsModel(LEAGUE, SEASON, '42');

        // Newest first → pastRaces[0] is subsession 200 (no result),
        // pastRaces[1] is subsession 100 (the one with a result).
        expect(model.pastRaces[0].protagonistFinish).toBeUndefined();
        expect(model.pastRaces[0].protagonistStart).toBeUndefined();
        expect(model.pastRaces[1].protagonistFinish).toBe(5);
        expect(model.pastRaces[1].protagonistStart).toBe(8);
        expect(mockGetDriverResults).toHaveBeenCalledWith(LEAGUE, '42', 'race');
    });

    it('does not call getDriverResults when no irCustId is provided', async () => {
        mockGetLeagueSeasonSessions.mockResolvedValue(makeSessions() as any);
        mockGetLeagueSimsessionIndex.mockResolvedValue(
            makeSimsessionIndex() as any
        );

        await getPastEventCardsModel(LEAGUE, SEASON);

        expect(mockGetDriverResults).not.toHaveBeenCalled();
    });

    it('carries the winner name from leagueSeasonSessions onto each card', async () => {
        mockGetLeagueSeasonSessions.mockResolvedValue(makeSessions() as any);
        mockGetLeagueSimsessionIndex.mockResolvedValue(
            makeSimsessionIndex() as any
        );

        const model = await getPastEventCardsModel(LEAGUE, SEASON);

        // Newest first → Elliot Cawte (Jan 22, sub 200) leads.
        expect(model.pastRaces[0].winnerName).toBe('Elliot Cawte');
        expect(model.pastRaces[1].winnerName).toBe('Adam Merchant');
    });

    it('populates each card headline from the AI summary when present', async () => {
        mockGetLeagueSeasonSessions.mockResolvedValue(makeSessions() as any);
        mockGetLeagueSimsessionIndex.mockResolvedValue(
            makeSimsessionIndex() as any
        );
        mockGetGeneratedSimsessionSummary.mockImplementation(
            async (sub: number) =>
                sub === 100
                    ? ({ title: 'Daytona Drama', text: '...' } as any)
                    : ({ title: 'Spa Symphony', text: '...' } as any)
        );

        const model = await getPastEventCardsModel(LEAGUE, SEASON);

        // Newest first → Spa (sub 200, Jan 22) leads, Daytona second.
        expect(model.pastRaces[0].headline).toBe('Spa Symphony');
        expect(model.pastRaces[1].headline).toBe('Daytona Drama');
    });

    it('falls through when the summary fetch fails or returns null', async () => {
        mockGetLeagueSeasonSessions.mockResolvedValue(makeSessions() as any);
        mockGetLeagueSimsessionIndex.mockResolvedValue(
            makeSimsessionIndex() as any
        );
        mockGetGeneratedSimsessionSummary.mockImplementation(
            async (sub: number) => {
                if (sub === 100) throw new Error('boom');
                return null;
            }
        );

        const model = await getPastEventCardsModel(LEAGUE, SEASON);

        // Both cards still appear — winner + date survive — just
        // without an AI headline. The strip never goes blank because
        // gentxt is having a bad day.
        expect(model.pastRaces).toHaveLength(2);
        expect(model.pastRaces[0].headline).toBeUndefined();
        expect(model.pastRaces[1].headline).toBeUndefined();
        // Newest first → Elliot Cawte (sub 200, Jan 22) at the head.
        expect(model.pastRaces[0].winnerName).toBe('Elliot Cawte');
        expect(model.pastRaces[1].winnerName).toBe('Adam Merchant');
    });
});
