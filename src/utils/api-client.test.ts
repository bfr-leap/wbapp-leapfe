import { describe, it, expect } from 'vitest';
import { prepUrl } from './api-client';

describe('prepUrl', () => {
    it('builds a query string from args', () => {
        const url = prepUrl({ namespace: 'ldata-rsltsts', type: 'test' });
        expect(url).toBe(
            '/api/fetch-document?namespace=ldata-rsltsts&type=test'
        );
    });

    it('handles numeric values', () => {
        const url = prepUrl({ namespace: 'ns', type: 't', id: 42 });
        expect(url).toBe('/api/fetch-document?namespace=ns&type=t&id=42');
    });

    it('handles empty args', () => {
        const url = prepUrl({});
        expect(url).toBe('/api/fetch-document?');
    });
});
