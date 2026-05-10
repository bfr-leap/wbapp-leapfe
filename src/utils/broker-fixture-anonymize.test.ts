import { describe, it, expect } from 'vitest';
import { anonymizeBrokerDoc } from './broker-fixture-anonymize';

describe('anonymizeBrokerDoc', () => {
    it('replaces cust_id with a deterministic synthetic number', () => {
        const out = anonymizeBrokerDoc([
            { cust_id: 174470, display_name: 'Arturo Mayorga' },
            { cust_id: 200001, display_name: 'Some Other Driver' },
        ]) as Array<Record<string, unknown>>;

        // Synthetic numbers start at 1000 in the order encountered.
        expect(out[0].cust_id).toBe(1000);
        expect(out[1].cust_id).toBe(1001);
        // Same cust_id mapped consistently inside the same doc.
        const dupOut = anonymizeBrokerDoc({
            primary: { cust_id: 174470 },
            secondary: { cust_id: 174470 },
        }) as { primary: { cust_id: number }; secondary: { cust_id: number } };
        expect(dupOut.primary.cust_id).toBe(dupOut.secondary.cust_id);
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

        // First seen name gets index 1.
        expect(out.members[0].display_name).toMatch(/^Driver \d+$/);
        // The shared "Arturo Mayorga" string maps to the same
        // placeholder in `driver_name`.
        expect(out.ruling.driver_name).toBe(out.members[0].display_name);
        // And the shared id maps to the same synthetic number.
        expect(out.ruling.driver_id).toBe(out.members[0].cust_id);
    });

    it('replaces email addresses', () => {
        const out = anonymizeBrokerDoc({
            email: 'real@example.com',
        }) as { email: string };
        expect(out.email).toMatch(/^user-\d+@example\.test$/);
    });

    it('rewrites cust_id arrays element-wise', () => {
        const out = anonymizeBrokerDoc({
            featured_cust_ids: [174470, 200001, 174470],
        }) as { featured_cust_ids: number[] };
        // Three entries, two unique → first two are unique synthetic
        // numbers and the third re-uses the first mapping.
        expect(out.featured_cust_ids).toHaveLength(3);
        expect(out.featured_cust_ids[0]).toBe(out.featured_cust_ids[2]);
        expect(out.featured_cust_ids[0]).not.toBe(out.featured_cust_ids[1]);
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
        expect(out.team_id).toBe(1000); // team_id is in PII_NUMBER_KEYS
        expect(out.team_name).toMatch(/^Driver \d+$/);
        expect(out.team_members[0]).toBe(1001);
        expect(out.team_members[1]).toBe(1002);
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
                leagues: Array<{ name: string; seasons: unknown[] }>;
            };
        };
        // `league_id` isn't in PII_NUMBER_KEYS — it's a stable
        // identifier the rendering code expects to match across docs.
        // So we expect it to be untouched.
        const schedule = out.schedule as Record<string, unknown>;
        expect(schedule.league_id).toBe(4534);
        // `name` IS in PII_NAME_KEYS — coarse but safer.
        expect(out.schedule.leagues[0].name).toMatch(/^Driver \d+$/);
        // Season ids are also untouched (also stable identifiers).
        // season_name IS replaced.
        expect(out.schedule.leagues[0].seasons).toHaveLength(1);
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
