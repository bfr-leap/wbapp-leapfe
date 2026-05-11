/**
 * Unit tests for the rulings OG card.
 *
 * The card surfaces the page's "License Standings" tab — per-driver
 * aggregates of license points sorted descending — rather than the raw
 * ruling list. These tests pin down:
 *   - driver-name resolution precedence (explicit name → roster lookup
 *     with numeric-AND-string driver_id → per-member fetch → discord
 *     id → `Driver <id>` → `Unknown`)
 *   - per-driver aggregation by discord_user_id / driver_id key
 *   - sort order and 4-row cap
 *   - empty-state body
 *
 * The numeric-string driver_id path is the production-bug case: the
 * broker delivers `driver_id` as a string on ruling docs, and an
 * earlier strict `typeof === 'number'` guard quietly skipped the
 * roster lookup, so the card displayed raw 18-digit discord
 * snowflakes instead of names.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
    StewardRuling,
    MembersData,
    M_Member,
} from '@@/lplib/endpoint-types/iracing-endpoints';

// Mock the og-data module: every broker call buildRulings makes goes
// through one of these named exports. Tests override the per-call
// return value via the mock implementations below.
vi.mock('./og-data', async () => {
    return {
        fetchActiveLeagueSchedule: vi.fn(async () => null),
        fetchCuratedLeagueTeamsInfo: vi.fn(async () => null),
        fetchLeagueDriverStats: vi.fn(async () => null),
        fetchLeagueSeasons: vi.fn(async () => ({
            seasons: [{ season_id: 131502, season_name: 'Season 18' }],
        })),
        fetchMembersData: vi.fn(async () => null),
        fetchRulings: vi.fn(async () => null),
        fetchSimsessionResults: vi.fn(async () => null),
        fetchSingleMemberData: vi.fn(async () => null),
        fetchTrackInfoDirectory: vi.fn(async () => null),
        fetchTrackStats: vi.fn(async () => null),
        // Match the real implementation: build a numeric cust_id →
        // display_name map, return a fallback `#${id}` for misses.
        buildNameLookup: (members: MembersData | null) => {
            const map = new Map<number, string>();
            for (const m of members?.members || []) {
                map.set(m.cust_id, m.display_name);
            }
            return (custId: number) => map.get(custId) || `#${custId}`;
        },
        resolveSubsessionName: vi.fn(async (_e, _l, s) => `Subsession ${s}`),
        resolveLeagueSeasonLabel: vi.fn(async () => ({
            leagueName: 'League Zero',
            seasonLabel: 'Season 18',
        })),
        resolveLgSeasSubCtx: vi.fn(async (_e, q) => ({
            league: q.league || '4534',
            season: q.season || '131502',
            subsession: q.subsession || '',
        })),
    };
});

import * as ogData from './og-data';
import { buildOgPayloadFromQuery } from './og-payload';

function ruling(overrides: Partial<StewardRuling>): StewardRuling {
    return {
        ruling_id: overrides.ruling_id || 'r-1',
        league_id: 4534,
        season_id: 131502,
        ruling_date: '2026-03-21 04:51:36',
        license_points: 1,
        sanctions: [],
        infraction: 'Causing a Collision',
        ...overrides,
    } as StewardRuling;
}

function members(entries: { cust_id: number; display_name: string }[]) {
    return { members: entries } as MembersData;
}

const QUERY = { m: 'rulings', league: '4534', season: '131502' };
// `buildRulings` only reads broker docs through the mocked og-data
// fetchers, never off the H3Event. Cast keeps the signature happy.
const EVENT = {} as Parameters<typeof buildOgPayloadFromQuery>[0];

beforeEach(() => {
    vi.clearAllMocks();
});

describe('buildOgPayloadFromQuery (m=rulings) — license standings card', () => {
    it('renders one row per driver with name, ruling count, and license pts', async () => {
        vi.mocked(ogData.fetchRulings).mockResolvedValueOnce([
            ruling({
                ruling_id: 'r-1',
                driver_id: 410106,
                driver_name: 'Ada Lovelace',
                license_points: 2,
            }),
        ]);
        vi.mocked(ogData.fetchMembersData).mockResolvedValueOnce(members([]));

        const payload = await buildOgPayloadFromQuery(EVENT, QUERY);

        expect(payload.metaTitle).toBe('League Zero — License Standings');
        expect(payload.card.eyebrow).toBe('LEAP · LICENSE STANDINGS');
        expect(payload.card.body).toMatchObject({
            type: 'rows',
            rows: [
                {
                    label: 'Ada Lovelace',
                    valueLeft: '1 ruling',
                    valueRight: '2 pts',
                    badge: expect.objectContaining({ text: '1' }),
                },
            ],
        });
    });

    it('aggregates multiple rulings on the same driver into one row', async () => {
        vi.mocked(ogData.fetchRulings).mockResolvedValueOnce([
            ruling({
                ruling_id: 'r-1',
                discord_user_id: '852699238105219114',
                driver_id: 410106,
                driver_name: 'Ada Lovelace',
                license_points: 2,
            }),
            ruling({
                ruling_id: 'r-2',
                discord_user_id: '852699238105219114',
                driver_id: 410106,
                driver_name: 'Ada Lovelace',
                license_points: 3,
            }),
        ]);
        vi.mocked(ogData.fetchMembersData).mockResolvedValueOnce(members([]));

        const payload = await buildOgPayloadFromQuery(EVENT, QUERY);

        if (payload.card.body.type !== 'rows') {
            throw new Error('expected rows body');
        }
        expect(payload.card.body.rows).toHaveLength(1);
        expect(payload.card.body.rows[0]).toMatchObject({
            label: 'Ada Lovelace',
            valueLeft: '2 rulings',
            valueRight: '5 pts',
        });
        // Subtitle still reports the total ruling count.
        expect(payload.card.subtitle).toBe('Season 18 · 2 rulings');
    });

    it('sorts standings by license points descending', async () => {
        vi.mocked(ogData.fetchRulings).mockResolvedValueOnce([
            ruling({
                ruling_id: 'a',
                driver_id: 1,
                driver_name: 'Low',
                license_points: 1,
            }),
            ruling({
                ruling_id: 'b',
                driver_id: 2,
                driver_name: 'High',
                license_points: 5,
            }),
            ruling({
                ruling_id: 'c',
                driver_id: 3,
                driver_name: 'Mid',
                license_points: 3,
            }),
        ]);
        vi.mocked(ogData.fetchMembersData).mockResolvedValueOnce(members([]));

        const payload = await buildOgPayloadFromQuery(EVENT, QUERY);

        if (payload.card.body.type !== 'rows') {
            throw new Error('expected rows body');
        }
        expect(payload.card.body.rows.map((r) => r.label)).toEqual([
            'High',
            'Mid',
            'Low',
        ]);
        // Meta description threads the top three.
        expect(payload.metaDescription).toBe(
            'Season 18 · 1. High · 2. Mid · 3. Low'
        );
    });

    it('resolves numeric-string driver_id via the season roster', async () => {
        // The production-bug case: the broker serialises driver_id
        // as a numeric string, and the prior `typeof === 'number'`
        // guard skipped the roster lookup so the card displayed the
        // raw discord_user_id snowflake.
        vi.mocked(ogData.fetchRulings).mockResolvedValueOnce([
            ruling({
                driver_id: '410106' as unknown as number,
                discord_user_id: '852699238105219114',
                license_points: 2,
            }),
        ]);
        vi.mocked(ogData.fetchMembersData).mockResolvedValueOnce(
            members([{ cust_id: 410106, display_name: 'Grace Hopper' }])
        );

        const payload = await buildOgPayloadFromQuery(EVENT, QUERY);

        if (payload.card.body.type !== 'rows') {
            throw new Error('expected rows body');
        }
        expect(payload.card.body.rows[0].label).toBe('Grace Hopper');
        expect(payload.metaDescription).toContain('Grace Hopper');
        expect(payload.metaDescription).not.toContain('852699238105219114');
    });

    it('resolves numeric driver_id via the season roster', async () => {
        vi.mocked(ogData.fetchRulings).mockResolvedValueOnce([
            ruling({ driver_id: 410106, license_points: 2 }),
        ]);
        vi.mocked(ogData.fetchMembersData).mockResolvedValueOnce(
            members([{ cust_id: 410106, display_name: 'Alan Turing' }])
        );

        const payload = await buildOgPayloadFromQuery(EVENT, QUERY);

        if (payload.card.body.type !== 'rows') {
            throw new Error('expected rows body');
        }
        expect(payload.card.body.rows[0].label).toBe('Alan Turing');
    });

    it('falls back to fetchSingleMemberData when driver_id is missing from the roster', async () => {
        vi.mocked(ogData.fetchRulings).mockResolvedValueOnce([
            ruling({
                driver_id: '99999' as unknown as number,
                license_points: 1,
            }),
        ]);
        vi.mocked(ogData.fetchMembersData).mockResolvedValueOnce(members([]));
        vi.mocked(ogData.fetchSingleMemberData).mockResolvedValueOnce({
            display_name: 'Edsger Dijkstra',
        } as M_Member);

        const payload = await buildOgPayloadFromQuery(EVENT, QUERY);

        expect(vi.mocked(ogData.fetchSingleMemberData)).toHaveBeenCalledWith(
            EVENT,
            '99999'
        );
        if (payload.card.body.type !== 'rows') {
            throw new Error('expected rows body');
        }
        expect(payload.card.body.rows[0].label).toBe('Edsger Dijkstra');
    });

    it('skips the single-member fetch when the roster already has the name', async () => {
        vi.mocked(ogData.fetchRulings).mockResolvedValueOnce([
            ruling({
                driver_id: '410106' as unknown as number,
                license_points: 1,
            }),
        ]);
        vi.mocked(ogData.fetchMembersData).mockResolvedValueOnce(
            members([{ cust_id: 410106, display_name: 'Margaret Hamilton' }])
        );

        await buildOgPayloadFromQuery(EVENT, QUERY);

        expect(vi.mocked(ogData.fetchSingleMemberData)).not.toHaveBeenCalled();
    });

    it('caps the card at four rows even when many drivers have rulings', async () => {
        const list: StewardRuling[] = [];
        const roster: { cust_id: number; display_name: string }[] = [];
        for (let i = 0; i < 10; i++) {
            list.push(
                ruling({
                    ruling_id: `r-${i}`,
                    driver_id: String(410106 + i) as unknown as number,
                    license_points: 10 - i,
                })
            );
            roster.push({
                cust_id: 410106 + i,
                display_name: `Driver ${i}`,
            });
        }
        vi.mocked(ogData.fetchRulings).mockResolvedValueOnce(list);
        vi.mocked(ogData.fetchMembersData).mockResolvedValueOnce(
            members(roster)
        );

        const payload = await buildOgPayloadFromQuery(EVENT, QUERY);

        if (payload.card.body.type !== 'rows') {
            throw new Error('expected rows body');
        }
        expect(payload.card.body.rows).toHaveLength(4);
        // Highest points come first.
        expect(payload.card.body.rows[0].label).toBe('Driver 0');
        expect(payload.card.body.rows[0].valueRight).toBe('10 pts');
    });

    it('omits drivers with zero license points from the standings', async () => {
        // A "Reprimand" or warning may not carry license points; those
        // drivers shouldn't take up a podium row in a points-sorted
        // standings card.
        vi.mocked(ogData.fetchRulings).mockResolvedValueOnce([
            ruling({
                ruling_id: 'r-points',
                driver_id: 1,
                driver_name: 'Pointful',
                license_points: 2,
            }),
            ruling({
                ruling_id: 'r-warn',
                driver_id: 2,
                driver_name: 'Reprimanded',
                license_points: 0,
            }),
        ]);
        vi.mocked(ogData.fetchMembersData).mockResolvedValueOnce(members([]));

        const payload = await buildOgPayloadFromQuery(EVENT, QUERY);

        if (payload.card.body.type !== 'rows') {
            throw new Error('expected rows body');
        }
        expect(payload.card.body.rows).toHaveLength(1);
        expect(payload.card.body.rows[0].label).toBe('Pointful');
    });

    it('falls back to discord_user_id in the standings when neither name nor driver_id resolve', async () => {
        vi.mocked(ogData.fetchRulings).mockResolvedValueOnce([
            ruling({
                discord_user_id: '852699238105219114',
                license_points: 2,
            }),
        ]);
        vi.mocked(ogData.fetchMembersData).mockResolvedValueOnce(members([]));

        const payload = await buildOgPayloadFromQuery(EVENT, QUERY);

        if (payload.card.body.type !== 'rows') {
            throw new Error('expected rows body');
        }
        expect(payload.card.body.rows[0].label).toBe('852699238105219114');
        // No per-member fetch when there's no cust_id to look up.
        expect(vi.mocked(ogData.fetchSingleMemberData)).not.toHaveBeenCalled();
    });

    it('renders the empty-state body when there are no rulings', async () => {
        vi.mocked(ogData.fetchRulings).mockResolvedValueOnce([]);
        vi.mocked(ogData.fetchMembersData).mockResolvedValueOnce(members([]));

        const payload = await buildOgPayloadFromQuery(EVENT, QUERY);

        expect(payload.card.body).toEqual({
            type: 'empty',
            message: 'No license points issued yet',
        });
        expect(payload.card.subtitle).toBe('Season 18 · 0 rulings');
    });

    it('renders the empty-state body when every ruling is a zero-point reprimand', async () => {
        vi.mocked(ogData.fetchRulings).mockResolvedValueOnce([
            ruling({
                driver_id: 1,
                driver_name: 'Reprimanded',
                license_points: 0,
            }),
        ]);
        vi.mocked(ogData.fetchMembersData).mockResolvedValueOnce(members([]));

        const payload = await buildOgPayloadFromQuery(EVENT, QUERY);

        expect(payload.card.body).toEqual({
            type: 'empty',
            message: 'No license points issued yet',
        });
        // The subtitle still counts every ruling, points or not.
        expect(payload.card.subtitle).toBe('Season 18 · 1 ruling');
    });
});
