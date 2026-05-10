import { describe, it, expect } from 'vitest';
import { anonymizeBrokerDoc } from './broker-fixture-anonymize';

describe('anonymizeBrokerDoc', () => {
    it('replaces cust_id with a deterministic synthetic number', () => {
        const out = anonymizeBrokerDoc([
            { cust_id: 174470, display_name: 'Arturo Mayorga' },
            { cust_id: 200001, display_name: 'Some Other Driver' },
        ]) as Array<Record<string, unknown>>;

        // Synthetic numbers are deterministic, in the 100000–999999
        // range, and never equal the input.
        expect(typeof out[0].cust_id).toBe('number');
        expect(out[0].cust_id).not.toBe(174470);
        expect(out[1].cust_id).not.toBe(200001);
        expect(out[0].cust_id).not.toBe(out[1].cust_id);

        // Same cust_id mapped consistently across separate calls.
        const dupOut = anonymizeBrokerDoc({
            primary: { cust_id: 174470 },
            secondary: { cust_id: 174470 },
        }) as { primary: { cust_id: number }; secondary: { cust_id: number } };
        expect(dupOut.primary.cust_id).toBe(dupOut.secondary.cust_id);
        expect(dupOut.primary.cust_id).toBe(out[0].cust_id);
    });

    it('replaces display_name and driver_name with synthetic placeholders', () => {
        const out = anonymizeBrokerDoc({
            members: [
                { cust_id: 1, display_name: 'Arturo Mayorga' },
                { cust_id: 2, display_name: 'Some Driver' },
            ],
            ruling: { driver_name: 'Arturo Mayorga', driver_id: 1 },
        }) as {
            members: Array<{ cust_id: number; display_name: string }>;
            ruling: { driver_name: string; driver_id: number };
        };

        expect(out.members[0].display_name).toMatch(/^Driver \d+$/);
        // Shared "Arturo Mayorga" string maps to the same placeholder
        // wherever it appears.
        expect(out.ruling.driver_name).toBe(out.members[0].display_name);
        // Shared id maps to the same synthetic number.
        expect(out.ruling.driver_id).toBe(out.members[0].cust_id);
    });

    it('replaces email addresses', () => {
        const out = anonymizeBrokerDoc({
            email: 'real@example.com',
        }) as { email: string };
        expect(out.email).toMatch(/^user-\d+@example\.test$/);
    });

    it('rewrites arrays under a PII number key element-wise', () => {
        // Some broker endpoints expose `cust_id: [1, 2, 3]` shapes
        // when a record references multiple drivers at once.
        const out = anonymizeBrokerDoc({
            cust_id: [174470, 200001, 174470],
        }) as { cust_id: number[] };
        expect(out.cust_id).toHaveLength(3);
        // Same input → same output, different inputs → different outputs.
        expect(out.cust_id[0]).toBe(out.cust_id[2]);
        expect(out.cust_id[0]).not.toBe(out.cust_id[1]);
        // None of the synthetics equal the original cust_id.
        expect(out.cust_id).not.toContain(174470);
        expect(out.cust_id).not.toContain(200001);
    });

    it('rewrites team_members (raw id arrays without a per-element key)', () => {
        const out = anonymizeBrokerDoc({
            team_id: 99,
            team_name: 'Real Team',
            team_members: [174470, 200001],
        }) as {
            team_id: number;
            team_name: string;
            team_members: number[];
        };
        expect(out.team_id).not.toBe(99);
        expect(out.team_name).toMatch(/^Driver \d+$/);
        expect(out.team_members).toHaveLength(2);
        expect(out.team_members[0]).not.toBe(174470);
        expect(out.team_members[1]).not.toBe(200001);
        expect(out.team_members[0]).not.toBe(out.team_members[1]);
    });

    it('handles string-form numeric ids (broker is loose about int-vs-string)', () => {
        const out = anonymizeBrokerDoc({
            driver_id: '585611',
            cust_id: 174470,
        }) as { driver_id: string; cust_id: number };
        // String stays a string, but is no longer the real id.
        expect(typeof out.driver_id).toBe('string');
        expect(out.driver_id).not.toBe('585611');
        expect(out.driver_id).toMatch(/^\d+$/);
    });

    it('redacts free-text fields that may contain real names in prose', () => {
        const out = anonymizeBrokerDoc({
            ruling: {
                steward_notes: 'Xavier Seynave overtook off-track on lap 12.',
                notes: 'Reviewed by Finley Fitzsimmons.',
            },
        }) as {
            ruling: { steward_notes: string; notes: string };
        };
        expect(out.ruling.steward_notes).toBe('[redacted]');
        expect(out.ruling.notes).toBe('[redacted]');
    });

    it('redacts discord identifiers', () => {
        const out = anonymizeBrokerDoc({
            discord_user_id: '852699238105219114',
            discord_username: 'realuser#1234',
        }) as { discord_user_id: string; discord_username: string };
        expect(out.discord_user_id).not.toBe('852699238105219114');
        expect(out.discord_user_id).toMatch(/^\d+$/);
        expect(out.discord_username).toMatch(/^Driver \d+$/);
    });

    it('rewrites outer keys of cust_id-keyed maps (e.g. leagueDriverStats)', () => {
        // The broker's `leagueDriverStats` returns
        // `{ "33393": {...}, "174470": {...} }` — the keys themselves
        // are real cust_ids that need anonymizing.
        const input = {
            '33393': { wins: 5, cust_id: 33393 },
            '174470': { wins: 3, cust_id: 174470 },
        };
        const out = anonymizeBrokerDoc(input) as Record<
            string,
            { wins: number; cust_id: number }
        >;
        const outKeys = Object.keys(out);
        expect(outKeys).not.toContain('33393');
        expect(outKeys).not.toContain('174470');
        expect(outKeys.every((k) => /^\d+$/.test(k))).toBe(true);
        // Inner cust_id and outer key map to the same synthetic value.
        for (const k of outKeys) {
            expect(String(out[k].cust_id)).toBe(k);
        }
    });

    it('preserves the structure of nested data', () => {
        const out = anonymizeBrokerDoc({
            schedule: {
                league_id: 4534,
                leagues: [
                    {
                        league_id: 4534,
                        name: 'League Zero',
                        seasons: [
                            { season_id: 131502, season_name: '2026 S1' },
                        ],
                    },
                ],
            },
        }) as {
            schedule: {
                league_id: number;
                leagues: Array<{
                    league_id: number;
                    name: string;
                    seasons: Array<{ season_id: number; season_name: string }>;
                }>;
            };
        };
        // `league_id` isn't in PII_NUMBER_KEYS — stable identifier
        // tests rely on, leave it alone.
        expect(out.schedule.league_id).toBe(4534);
        // `name` IS in PII_NAME_KEYS — coarse but safer.
        expect(out.schedule.leagues[0].name).toMatch(/^Driver \d+$/);
        expect(out.schedule.leagues[0].seasons).toHaveLength(1);
        expect(out.schedule.leagues[0].seasons[0].season_id).toBe(131502);
    });

    it('does not mutate the input document', () => {
        const input = {
            cust_id: 174470,
            display_name: 'Real Person',
        };
        const before = JSON.stringify(input);
        anonymizeBrokerDoc(input);
        expect(JSON.stringify(input)).toBe(before);
    });

    it('handles null / primitive inputs without crashing', () => {
        expect(anonymizeBrokerDoc(null)).toBeNull();
        expect(anonymizeBrokerDoc(undefined)).toBeUndefined();
        expect(anonymizeBrokerDoc('plain string')).toBe('plain string');
        expect(anonymizeBrokerDoc(42)).toBe(42);
    });
});
