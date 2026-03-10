import { describe, it, expect } from 'vitest';
import { MurmurHashV2, MurmurHashV3 } from './hash-util';

describe('MurmurHashV2', () => {
    it('returns a string starting with H', () => {
        const result = MurmurHashV2('hello', 0);
        expect(result).toMatch(/^H\d+$/);
    });

    it('produces deterministic output for the same input', () => {
        const a = MurmurHashV2('test-string', 42);
        const b = MurmurHashV2('test-string', 42);
        expect(a).toBe(b);
    });

    it('produces different output for different seeds', () => {
        const a = MurmurHashV2('hello', 1);
        const b = MurmurHashV2('hello', 2);
        expect(a).not.toBe(b);
    });

    it('produces different output for different inputs', () => {
        const a = MurmurHashV2('hello', 0);
        const b = MurmurHashV2('world', 0);
        expect(a).not.toBe(b);
    });

    it('handles empty string', () => {
        const result = MurmurHashV2('', 0);
        expect(result).toMatch(/^H\d+$/);
    });
});

describe('MurmurHashV3', () => {
    it('returns a string starting with H', () => {
        const result = MurmurHashV3('hello', 0);
        expect(result).toMatch(/^H\d+$/);
    });

    it('produces deterministic output for the same input', () => {
        const a = MurmurHashV3('test-string', 42);
        const b = MurmurHashV3('test-string', 42);
        expect(a).toBe(b);
    });

    it('produces different output for different seeds', () => {
        const a = MurmurHashV3('hello', 1);
        const b = MurmurHashV3('hello', 2);
        expect(a).not.toBe(b);
    });

    it('handles longer strings', () => {
        const longStr = 'a'.repeat(1000);
        const result = MurmurHashV3(longStr, 0);
        expect(result).toMatch(/^H\d+$/);
    });
});
