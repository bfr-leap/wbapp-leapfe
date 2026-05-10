import { describe, it, expect } from 'vitest';
import { selectChip } from './scope-chip-selector';

describe('selectChip', () => {
    describe('Results page', () => {
        it('returns "results" when on ?m=results with a resolved league_id', () => {
            expect(selectChip({ m: 'results' }, { league_id: 1 })).toBe(
                'results'
            );
        });

        // Regression: the chip used to fall through to "league-season"
        // when the URL was ?m=results&league=X with no season /
        // subsession / simsession query params, because the v-if
        // checked route.query directly. The page renders defaulted
        // values via defLgSeasSubCtx, so the chip must too.
        it('returns "results" even with missing season/subsession/simsession query params, as long as ctx.league_id is resolved', () => {
            expect(
                selectChip({ m: 'results' }, { league_id: 1, season_id: 0 })
            ).toBe('results');
        });

        it('returns null on ?m=results before context resolves', () => {
            expect(selectChip({ m: 'results' }, {})).toBe(null);
        });
    });

    describe('Track Stats page', () => {
        it('returns "track" when on ?m=track with car and track in query', () => {
            expect(
                selectChip(
                    { m: 'track', car: '123', track: '456' },
                    { league_id: 1 }
                )
            ).toBe('track');
        });

        it('does not return "track" when track query param is missing', () => {
            expect(
                selectChip({ m: 'track', car: '123' }, { league_id: 1 })
            ).not.toBe('track');
        });

        it('does not return "track" when car query param is missing', () => {
            expect(
                selectChip({ m: 'track', track: '456' }, { league_id: 1 })
            ).not.toBe('track');
        });
    });

    describe('Default league/season chip', () => {
        it('returns "league-season" on home with both ids resolved', () => {
            expect(selectChip({}, { league_id: 1, season_id: 5 })).toBe(
                'league-season'
            );
        });

        it('returns "league-season" on standings/rulings/profile pages', () => {
            for (const m of ['standings', 'rulings', 'profile', 'driver']) {
                expect(selectChip({ m }, { league_id: 1, season_id: 5 })).toBe(
                    'league-season'
                );
            }
        });

        it('returns null when season_id is missing', () => {
            expect(selectChip({}, { league_id: 1 })).toBe(null);
        });
    });

    describe('Empty / unresolved state', () => {
        it('returns null with no route mode and no context', () => {
            expect(selectChip({}, {})).toBe(null);
        });

        it('returns null with an unknown mode and no context', () => {
            expect(selectChip({ m: 'unknown' }, {})).toBe(null);
        });
    });

    describe('Mode precedence', () => {
        // Results wins over default league-season even when both
        // could conceivably match — the user is on the Results
        // page and should see the Results chip.
        it('"results" takes precedence over "league-season" when both could match', () => {
            expect(
                selectChip({ m: 'results' }, { league_id: 1, season_id: 5 })
            ).toBe('results');
        });

        it('"track" takes precedence over "league-season" when both could match', () => {
            expect(
                selectChip(
                    { m: 'track', car: '1', track: '2' },
                    { league_id: 1, season_id: 5 }
                )
            ).toBe('track');
        });
    });
});
