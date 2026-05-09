import { describe, it, expect } from 'vitest';
import { pickHeroPhoto } from './photo-service';
import type { PhotoEntry } from '@@/lplib/endpoint-types/photo-endpoints';

function photo(over: Partial<PhotoEntry>): PhotoEntry {
    return {
        filename: 'x.jpg',
        url: 'https://example.com/x.jpg',
        ...over,
    };
}

describe('pickHeroPhoto', () => {
    it('returns null on empty input', () => {
        expect(pickHeroPhoto([], '174470')).toBeNull();
    });

    it('prefers a photo featuring the protagonist over a higher-scored one that does not', () => {
        const photos = [
            photo({ filename: 'a.jpg', score: 0.9 }),
            photo({
                filename: 'b.jpg',
                score: 0.5,
                featured_cust_ids: [174470],
            }),
        ];
        expect(pickHeroPhoto(photos, '174470')?.filename).toBe('b.jpg');
    });

    it('ranks featured photos by score', () => {
        const photos = [
            photo({
                filename: 'a.jpg',
                score: 0.4,
                featured_cust_ids: [174470],
            }),
            photo({
                filename: 'b.jpg',
                score: 0.8,
                featured_cust_ids: [174470],
            }),
        ];
        expect(pickHeroPhoto(photos, '174470')?.filename).toBe('b.jpg');
    });

    it('falls back to top-scored overall when no photo features the protagonist', () => {
        const photos = [
            photo({ filename: 'a.jpg', score: 0.3 }),
            photo({ filename: 'b.jpg', score: 0.9 }),
        ];
        expect(pickHeroPhoto(photos, '174470')?.filename).toBe('b.jpg');
    });

    it('treats missing scores as 0', () => {
        const photos = [
            photo({ filename: 'a.jpg' }),
            photo({ filename: 'b.jpg', score: 0.1 }),
        ];
        expect(pickHeroPhoto(photos, '')?.filename).toBe('b.jpg');
    });

    it('returns null when protagonistCustId is empty and pool has no scores', () => {
        const photos = [photo({ filename: 'a.jpg' })];
        expect(pickHeroPhoto(photos, '')?.filename).toBe('a.jpg');
    });
});
