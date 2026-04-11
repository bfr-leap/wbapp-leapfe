import { describe, it, expect } from 'vitest';
import type { StewardRuling } from '@@/lplib/endpoint-types/iracing-endpoints';
import {
    buildDriverNameMapFromRoster,
    championshipPointsDeducted,
    computeDriverStandings,
    parseRulingDate,
    resolveRulingDriverName,
    sortRulingsByDateDesc,
} from './steward-rulings-model';

function makeRuling(overrides: Partial<StewardRuling>): StewardRuling {
    return {
        ruling_id: 'r1',
        league_id: 1,
        season_id: 1,
        ruling_date: '2026-01-01T00:00:00Z',
        license_points: 0,
        sanctions: [],
        ...overrides,
    };
}

describe('championshipPointsDeducted', () => {
    it('returns 0 when there are no sanctions', () => {
        const r = makeRuling({});
        expect(championshipPointsDeducted(r)).toBe(0);
    });

    it('sums values for championship_point_deduction sanctions only', () => {
        const r = makeRuling({
            sanctions: [
                { type: 'championship_point_deduction', value: 5 },
                { type: 'qualifying_ban' },
                { type: 'championship_point_deduction', value: 3 },
                { type: 'license_points', value: 2 },
            ],
        });
        expect(championshipPointsDeducted(r)).toBe(8);
    });

    it('ignores deductions without a numeric value', () => {
        const r = makeRuling({
            sanctions: [{ type: 'championship_point_deduction' }],
        });
        expect(championshipPointsDeducted(r)).toBe(0);
    });
});

describe('computeDriverStandings', () => {
    it('returns an empty array when there are no rulings', () => {
        expect(computeDriverStandings([])).toEqual([]);
    });

    it('groups by discord_user_id and sums license points and deductions', () => {
        const rulings: StewardRuling[] = [
            makeRuling({
                ruling_id: 'a1',
                discord_user_id: 'alice',
                driver_name: 'Alice',
                license_points: 2,
                sanctions: [{ type: 'championship_point_deduction', value: 5 }],
            }),
            makeRuling({
                ruling_id: 'a2',
                discord_user_id: 'alice',
                license_points: 1,
                sanctions: [
                    { type: 'championship_point_deduction', value: 2 },
                    { type: 'qualifying_ban' },
                ],
            }),
            makeRuling({
                ruling_id: 'b1',
                discord_user_id: 'bob',
                driver_name: 'Bob',
                license_points: 4,
                sanctions: [],
            }),
        ];

        const standings = computeDriverStandings(rulings);
        expect(standings).toHaveLength(2);
        // Sorted by license points desc; Bob (4) > Alice (3)
        expect(standings[0].driverName).toBe('Bob');
        expect(standings[0].totalLicensePoints).toBe(4);
        expect(standings[0].totalRulings).toBe(1);
        expect(standings[0].totalChampionshipPointDeduction).toBe(0);

        expect(standings[1].driverName).toBe('Alice');
        expect(standings[1].totalLicensePoints).toBe(3);
        expect(standings[1].totalRulings).toBe(2);
        expect(standings[1].totalChampionshipPointDeduction).toBe(7);
    });

    it('falls back to driver_id when discord_user_id is missing', () => {
        const rulings: StewardRuling[] = [
            makeRuling({
                ruling_id: 'x1',
                driver_id: 999,
                license_points: 1,
            }),
            makeRuling({
                ruling_id: 'x2',
                driver_id: 999,
                license_points: 2,
            }),
        ];

        const standings = computeDriverStandings(rulings);
        expect(standings).toHaveLength(1);
        expect(standings[0].driverId).toBe(999);
        expect(standings[0].totalLicensePoints).toBe(3);
        expect(standings[0].totalRulings).toBe(2);
    });

    it('resolves driver names from the roster name map', () => {
        const rulings: StewardRuling[] = [
            makeRuling({
                ruling_id: 'x1',
                driver_id: 12345,
                license_points: 2,
            }),
        ];
        const nameMap = { 12345: 'Ayrton Senna' };
        const standings = computeDriverStandings(rulings, nameMap);
        expect(standings[0].driverName).toBe('Ayrton Senna');
    });

    it('prefers explicit driver_name over the roster map', () => {
        const rulings: StewardRuling[] = [
            makeRuling({
                ruling_id: 'x1',
                driver_id: 12345,
                driver_name: 'Backend Name',
                license_points: 1,
            }),
        ];
        const nameMap = { 12345: 'Roster Name' };
        const standings = computeDriverStandings(rulings, nameMap);
        expect(standings[0].driverName).toBe('Backend Name');
    });

    it('keeps drivers separate when only one has a discord id', () => {
        const rulings: StewardRuling[] = [
            makeRuling({
                ruling_id: 'a1',
                discord_user_id: 'alice',
                driver_id: 100,
                license_points: 2,
            }),
            makeRuling({
                ruling_id: 'b1',
                driver_id: 100,
                license_points: 3,
            }),
        ];

        const standings = computeDriverStandings(rulings);
        expect(standings).toHaveLength(2);
    });
});

describe('buildDriverNameMapFromRoster', () => {
    it('returns an empty map when given null', () => {
        expect(buildDriverNameMapFromRoster(null)).toEqual({});
    });

    it('builds a cust_id → display_name map', () => {
        const roster = [
            { cust_id: 1, display_name: 'Alice' },
            { cust_id: 2, display_name: 'Bob' },
        ];
        expect(buildDriverNameMapFromRoster(roster)).toEqual({
            1: 'Alice',
            2: 'Bob',
        });
    });

    it('skips entries missing cust_id or display_name', () => {
        const roster = [
            { cust_id: 1, display_name: 'Alice' },
            { cust_id: 2, display_name: '' },
            // @ts-expect-error intentionally malformed
            { display_name: 'Orphan' },
        ];
        expect(buildDriverNameMapFromRoster(roster)).toEqual({ 1: 'Alice' });
    });
});

describe('resolveRulingDriverName', () => {
    it('prefers an explicit driver_name', () => {
        const r = makeRuling({
            driver_name: 'Explicit',
            driver_id: 1,
            discord_user_id: 'd',
        });
        expect(resolveRulingDriverName(r, { 1: 'Roster' })).toBe('Explicit');
    });

    it('uses the roster name when driver_id is known', () => {
        const r = makeRuling({ driver_id: 1, discord_user_id: 'd' });
        expect(resolveRulingDriverName(r, { 1: 'Roster' })).toBe('Roster');
    });

    it('falls back to discord_user_id when the roster does not know the driver', () => {
        const r = makeRuling({ driver_id: 99, discord_user_id: 'd' });
        expect(resolveRulingDriverName(r, { 1: 'Roster' })).toBe('d');
    });

    it('falls back to a Driver <id> placeholder when nothing else is available', () => {
        const r = makeRuling({ driver_id: 42 });
        expect(resolveRulingDriverName(r, {})).toBe('Driver 42');
    });

    it('returns Unknown when no identifier is present', () => {
        const r = makeRuling({});
        expect(resolveRulingDriverName(r, {})).toBe('Unknown');
    });
});

describe('parseRulingDate', () => {
    it('returns null for empty or missing input', () => {
        expect(parseRulingDate(null)).toBeNull();
        expect(parseRulingDate(undefined)).toBeNull();
        expect(parseRulingDate('')).toBeNull();
        expect(parseRulingDate('   ')).toBeNull();
    });

    it('returns null for unparseable input', () => {
        expect(parseRulingDate('not a date')).toBeNull();
    });

    it('treats date+time strings with no timezone as UTC', () => {
        // Without the fix, this string would be interpreted as local
        // time, which would shift the Unix timestamp by the runtime
        // offset. We pin the expected value to the UTC instant.
        const d = parseRulingDate('2026-01-01T12:00:00');
        expect(d).not.toBeNull();
        expect(d!.getTime()).toBe(Date.UTC(2026, 0, 1, 12, 0, 0));
    });

    it('respects an explicit Z suffix', () => {
        const d = parseRulingDate('2026-01-01T12:00:00Z');
        expect(d!.getTime()).toBe(Date.UTC(2026, 0, 1, 12, 0, 0));
    });

    it('respects an explicit numeric offset', () => {
        // 12:00 at +05:00 is 07:00 UTC.
        const d = parseRulingDate('2026-01-01T12:00:00+05:00');
        expect(d!.getTime()).toBe(Date.UTC(2026, 0, 1, 7, 0, 0));
    });

    it('handles date-only strings as UTC (ES spec default)', () => {
        const d = parseRulingDate('2026-01-01');
        expect(d!.getTime()).toBe(Date.UTC(2026, 0, 1, 0, 0, 0));
    });

    it('handles fractional seconds', () => {
        const d = parseRulingDate('2026-01-01T12:00:00.123');
        expect(d!.getTime()).toBe(Date.UTC(2026, 0, 1, 12, 0, 0, 123));
    });
});

describe('sortRulingsByDateDesc', () => {
    it('returns rulings ordered most-recent first', () => {
        const r1 = makeRuling({
            ruling_id: 'r1',
            ruling_date: '2026-01-10T00:00:00Z',
        });
        const r2 = makeRuling({
            ruling_id: 'r2',
            ruling_date: '2026-03-01T00:00:00Z',
        });
        const r3 = makeRuling({
            ruling_id: 'r3',
            ruling_date: '2026-02-15T00:00:00Z',
        });
        const sorted = sortRulingsByDateDesc([r1, r2, r3]);
        expect(sorted.map((r) => r.ruling_id)).toEqual(['r2', 'r3', 'r1']);
    });

    it('does not mutate the input array', () => {
        const input = [
            makeRuling({ ruling_id: 'a', ruling_date: '2025-01-01' }),
            makeRuling({ ruling_id: 'b', ruling_date: '2026-01-01' }),
        ];
        const original = input.map((r) => r.ruling_id);
        sortRulingsByDateDesc(input);
        expect(input.map((r) => r.ruling_id)).toEqual(original);
    });
});
