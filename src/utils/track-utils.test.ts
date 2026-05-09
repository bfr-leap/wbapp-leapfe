import { describe, it, expect } from 'vitest';
import { venueKey } from './track-utils';
import type {
    CuratedTrackDisplayhInfo,
    TrackInfoDirectory,
} from 'lplib/endpoint-types/iracing-endpoints';

describe('venueKey', () => {
    const curated: CuratedTrackDisplayhInfo = {
        '300': { short_display: 'HRNG', display: 'Hungaroring GP' },
        '301': { short_display: 'HRNG', display: 'Hungaroring National' },
        '400': { short_display: 'SUZ', display: 'Suzuka Circuit' },
    };

    it('returns the same key for two layouts of the same venue', () => {
        expect(venueKey('300', curated)).toBe(venueKey('301', curated));
    });

    it('returns different keys for different venues', () => {
        expect(venueKey('300', curated)).not.toBe(venueKey('400', curated));
    });

    it('falls back to the raw trackId when display info is missing', () => {
        expect(venueKey('999', curated)).toBe('999');
        expect(venueKey('300', null)).toBe('300');
    });

    it('uppercases short_display so casing differences do not split venues', () => {
        const lower: CuratedTrackDisplayhInfo = {
            '500': { short_display: 'hrng', display: 'Hungaroring' },
        };
        expect(venueKey('500', lower)).toBe('HRNG');
    });

    it('uses the league track_display name when curated info is missing', () => {
        const directory: TrackInfoDirectory = {
            league_name: 'Test',
            track_display: {
                '700': 'Hungaroring (Grand Prix)',
                '701': 'Hungaroring (Short)',
            },
            car_display: {},
            car_2_track_map: {},
        };
        expect(venueKey('700', null, directory)).toBe('hungaroring');
        expect(venueKey('700', null, directory)).toBe(
            venueKey('701', null, directory)
        );
    });

    it('prefers the league directory name over curated short_display', () => {
        // Real-world case: Hungaroring configs have different curated shorts
        // (HUNG vs HRNG) but share the league directory name "Hungaroring".
        const curatedSplit: CuratedTrackDisplayhInfo = {
            '413': { short_display: 'HUNG', display: 'Hungaroring' },
            '390': {
                short_display: 'HRNG',
                display: 'Hungaroring National',
            },
        };
        const directory: TrackInfoDirectory = {
            league_name: 'Test',
            track_display: {
                '413': 'Hungaroring',
                '390': 'Hungaroring',
            },
            car_display: {},
            car_2_track_map: {},
        };
        expect(venueKey('413', curatedSplit, directory)).toBe(
            venueKey('390', curatedSplit, directory)
        );
    });
});
