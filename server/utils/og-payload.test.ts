/**
 * Unit tests for the rulings OG card driver-name resolution.
 *
 * The card kept falling through to raw discord_user_id snowflakes in
 * production because the broker serialises iRacing cust_ids as
 * numeric strings on ruling docs, while a strict `typeof === 'number'`
 * check skipped the roster lookup. These tests pin the precedence
 * down (explicit name → roster → per-member fetch → discord →
 * `Driver <id>` → `Unknown`) and cover the string-id coercion path.
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
        license_points: 0,
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

describe('buildOgPayloadFromQuery (m=rulings) — driver name resolution', () => {
    it('prefers explicit driver_name on the ruling over any lookup', async () => {
        vi.mocked(ogData.fetchRulings).mockResolvedValueOnce([
            ruling({ driver_id: 410106, driver_name: 'Ada Lovelace' }),
        ]);
        vi.mocked(ogData.fetchMembersData).mockResolvedValueOnce(
            members([{ cust_id: 410106, display_name: 'SHOULD NOT WIN' }])
        );

        const payload = await buildOgPayloadFromQuery(EVENT, QUERY);

        expect(payload.card.body).toMatchObject({
            type: 'rows',
            rows: [expect.objectContaining({ label: 'Ada Lovelace' })],
        });
    });

    it('resolves numeric-string driver_id via the season roster', async () => {
        // This is the production-bug case: the broker delivers
        // driver_id as a numeric STRING, not a number. The strict
        // typeof-number guard skipped the roster lookup and the card
        // displayed the raw discord_user_id snowflake instead.
        vi.mocked(ogData.fetchRulings).mockResolvedValueOnce([
            ruling({
                driver_id: '410106' as unknown as number,
                discord_user_id: '852699238105219114',
            }),
        ]);
        vi.mocked(ogData.fetchMembersData).mockResolvedValueOnce(
            members([{ cust_id: 410106, display_name: 'Grace Hopper' }])
        );

        const payload = await buildOgPayloadFromQuery(EVENT, QUERY);

        expect(payload.card.body).toMatchObject({
            type: 'rows',
            rows: [expect.objectContaining({ label: 'Grace Hopper' })],
        });
        // And the meta description shouldn't leak the snowflake either.
        expect(payload.metaDescription).toContain('Grace Hopper');
        expect(payload.metaDescription).not.toContain('852699238105219114');
    });

    it('resolves numeric driver_id via the season roster', async () => {
        vi.mocked(ogData.fetchRulings).mockResolvedValueOnce([
            ruling({ driver_id: 410106 }),
        ]);
        vi.mocked(ogData.fetchMembersData).mockResolvedValueOnce(
            members([{ cust_id: 410106, display_name: 'Alan Turing' }])
        );

        const payload = await buildOgPayloadFromQuery(EVENT, QUERY);

        expect(payload.card.body).toMatchObject({
            type: 'rows',
            rows: [expect.objectContaining({ label: 'Alan Turing' })],
        });
    });

    it('falls back to fetchSingleMemberData when driver_id is missing from the roster', async () => {
        vi.mocked(ogData.fetchRulings).mockResolvedValueOnce([
            ruling({ driver_id: '99999' as unknown as number }),
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
        expect(payload.card.body).toMatchObject({
            type: 'rows',
            rows: [expect.objectContaining({ label: 'Edsger Dijkstra' })],
        });
    });

    it('skips the single-member fetch when the roster already has the name', async () => {
        vi.mocked(ogData.fetchRulings).mockResolvedValueOnce([
            ruling({ driver_id: '410106' as unknown as number }),
        ]);
        vi.mocked(ogData.fetchMembersData).mockResolvedValueOnce(
            members([{ cust_id: 410106, display_name: 'Margaret Hamilton' }])
        );

        await buildOgPayloadFromQuery(EVENT, QUERY);

        expect(vi.mocked(ogData.fetchSingleMemberData)).not.toHaveBeenCalled();
    });

    it('falls back to discord_user_id when neither name nor driver_id resolve', async () => {
        // No driver_id at all — there's nothing to look up. The card
        // has to display *something*; matching the SPA's
        // `resolveRulingDriverName`, we surface the discord id.
        vi.mocked(ogData.fetchRulings).mockResolvedValueOnce([
            ruling({ discord_user_id: '852699238105219114' }),
        ]);
        vi.mocked(ogData.fetchMembersData).mockResolvedValueOnce(members([]));

        const payload = await buildOgPayloadFromQuery(EVENT, QUERY);

        expect(payload.card.body).toMatchObject({
            type: 'rows',
            rows: [expect.objectContaining({ label: '852699238105219114' })],
        });
        // And we shouldn't have wasted a per-member fetch on a value
        // we can't coerce to a cust_id.
        expect(vi.mocked(ogData.fetchSingleMemberData)).not.toHaveBeenCalled();
    });

    it('caps the card at four rows even when many rulings exist', async () => {
        const list = Array.from({ length: 10 }, (_, i) =>
            ruling({
                ruling_id: `r-${i}`,
                driver_id: String(410106 + i) as unknown as number,
                ruling_date: `2026-03-${String(21 - i).padStart(2, '0')}`,
            })
        );
        vi.mocked(ogData.fetchRulings).mockResolvedValueOnce(list);
        vi.mocked(ogData.fetchMembersData).mockResolvedValueOnce(
            members(
                Array.from({ length: 10 }, (_, i) => ({
                    cust_id: 410106 + i,
                    display_name: `Driver ${i}`,
                }))
            )
        );

        const payload = await buildOgPayloadFromQuery(EVENT, QUERY);

        if (payload.card.body.type !== 'rows') {
            throw new Error('expected rows body');
        }
        expect(payload.card.body.rows).toHaveLength(4);
        // Most-recent first: r-0 has the latest ruling_date.
        expect(payload.card.body.rows[0].label).toBe('Driver 0');
    });

    it('renders the empty-state body when there are no rulings', async () => {
        vi.mocked(ogData.fetchRulings).mockResolvedValueOnce([]);
        vi.mocked(ogData.fetchMembersData).mockResolvedValueOnce(members([]));

        const payload = await buildOgPayloadFromQuery(EVENT, QUERY);

        expect(payload.card.body).toEqual({
            type: 'empty',
            message: 'No rulings yet this season',
        });
    });
});
