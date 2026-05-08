import { describe, it, expect } from 'vitest';
import { venueKey } from './track-utils';
import type { CuratedTrackDisplayhInfo } from 'lplib/endpoint-types/iracing-endpoints';

describe('venueKey', () => {
    const displayInfo: CuratedTrackDisplayhInfo = {
        '300': { short_display: 'HRNG', display: 'Hungaroring GP' },
        '301': { short_display: 'HRNG', display: 'Hungaroring National' },
        '400': { short_display: 'SUZ', display: 'Suzuka Circuit' },
    };

    it('returns the same key for two layouts of the same venue', () => {
        expect(venueKey('300', displayInfo)).toBe(venueKey('301', displayInfo));
    });

    it('returns different keys for different venues', () => {
        expect(venueKey('300', displayInfo)).not.toBe(
            venueKey('400', displayInfo)
        );
    });

    it('falls back to the raw trackId when display info is missing', () => {
        expect(venueKey('999', displayInfo)).toBe('999');
        expect(venueKey('300', null)).toBe('300');
    });

    it('uppercases short_display so casing differences do not split venues', () => {
        const lower: CuratedTrackDisplayhInfo = {
            '500': { short_display: 'hrng', display: 'Hungaroring' },
        };
        expect(venueKey('500', lower)).toBe('HRNG');
    });
});
