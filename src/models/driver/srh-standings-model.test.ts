import { describe, it, expect } from 'vitest';

import {
    sessionKeyId,
    parseSessionKeyId,
    listRacedSessionKeys,
    listAllSessionKeys,
    splitDriverRaceLedger,
    reconcilePoints,
    pointsBreakdown,
    positionDelta,
    rankByPosition,
    decodeHtmlEntities,
    formatSrhLapTime,
    srhRaceRating,
    seasonProgress,
    eventLabel,
    buildSrhTeamRows,
    driverDisplay,
} from './srh-standings-model';
import type {
    SeasonInfo,
    DriverStanding,
    RaceResult,
    SessionKey,
} from '@@/src/services/srhweb-types';

// ---------------------------------------------------------------------------
// Factories — seeded with the real shape of league 4534 / season 134456, so
// these tests double as documentation of what the dataset actually looks like.
// ---------------------------------------------------------------------------

function makeTrack(
    name = 'Circuit de Spa-Francorchamps',
    config = 'Grand Prix Pits'
) {
    return {
        track_id: 103,
        config_id: 523,
        track_name: name,
        config_name: config,
        length_km: 4.35,
        turns: 19,
    };
}

/** A resolved heat weekend: -4 … 0, races at -2 and 0. */
function makeEvent(subsessionId: number | null, raceDate = 1781755200) {
    return {
        subsession_id: subsessionId,
        sessions:
            subsessionId === null
                ? []
                : [
                      {
                          simsession_number: -4,
                          session_type: 'OPEN PRACTICE',
                          is_race: false,
                      },
                      {
                          simsession_number: -3,
                          session_type: 'OPEN QUALIFYING',
                          is_race: false,
                      },
                      {
                          simsession_number: -2,
                          session_type: 'RACE',
                          is_race: true,
                      },
                      {
                          simsession_number: -1,
                          session_type: 'OPEN PRACTICE',
                          is_race: false,
                      },
                      {
                          simsession_number: 0,
                          session_type: 'RACE',
                          is_race: true,
                      },
                  ],
        race_date: raceDate,
        track: makeTrack(),
        event_name: null,
        is_chase: false,
        can_drop: true,
        counts_for_points: true,
    };
}

function makeSeason(overrides: Partial<SeasonInfo> = {}): SeasonInfo {
    return {
        season_id: 134456,
        season_name: 'Season 19',
        league_id: 4534,
        league_name: 'League Zero',
        series_name: 'Formula Series',
        drop_weeks: 1,
        keep_weeks: 4,
        allow_negative_race_points: true,
        allow_negative_standings_points: true,
        classes: [{ class_id: 0, class_name: 'Overall' }],
        // Five resolved events + six unrun — the real 11-round shape.
        schedule: [
            makeEvent(86551649, 1781755200),
            makeEvent(86727453, 1782360000),
            makeEvent(86905345, 1782964800),
            makeEvent(87253846, 1784174400),
            makeEvent(87426864, 1784779200),
            makeEvent(null, 1785384000),
            makeEvent(null, 1785988800),
            makeEvent(null, 1786593600),
            makeEvent(null, 1787198400),
            makeEvent(null, 1787803200),
            makeEvent(null, 1788408000),
        ],
        drivers: {
            '174470': {
                cust_id: 174470,
                display_name: 'Arturo Mayorga',
                sort_name: 'Mayorga, Arturo',
                country_code: 'US',
            },
        },
        ...overrides,
    } as SeasonInfo;
}

function makeStanding(overrides: Partial<DriverStanding> = {}): DriverStanding {
    return {
        cust_id: 174470,
        position: 16,
        position_previous: 19,
        position_change: 3,
        total_points: 15,
        race_points: 15,
        bonus_points: 0,
        penalty_points: 0,
        stage_points: 0,
        starts: 10,
        wins: 0,
        stage_wins: 0,
        poles: 0,
        podiums: 0,
        top_5: 0,
        top_10: 2,
        laps: 142,
        laps_led: 0,
        incidents: 21,
        corners: 1500,
        miles: 200.5,
        rating: 812,
        races_counted: 10,
        counted_races: [],
        dropped_races: [],
        is_provisional: false,
        car_ids: [152],
        ...overrides,
    } as DriverStanding;
}

function makeRaceRow(overrides: Partial<RaceResult> = {}): RaceResult {
    return {
        cust_id: 174470,
        car_id: 152,
        position: 9,
        position_class: 9,
        start_position: 11,
        qualify_time: 1234567,
        laps_completed: 14,
        laps_led: 0,
        incidents: 2,
        status: 'Running',
        race_points: 5,
        bonus_points: 0,
        penalty_points: 0,
        stage_points: 0,
        total_points: 5,
        fastest_lap_time: 1231234,
        avg_fast_lap_time: 1240000,
        avg_lap_time: 1259000,
        num_fast_laps: 3,
        avg_pos: 9.4,
        avg_running_pos: 9.1,
        passes: 6,
        quality_passes: 2,
        closing_passes: 1,
        rating: 83.0185,
        counts_toward_stats: true,
        counts_toward_standings: true,
        is_provisional: false,
        ...overrides,
    } as RaceResult;
}

/** All sessions of one event, the shape dropped_races actually takes. */
function allSessionsOf(subsessionId: number): SessionKey[] {
    return [-4, -3, -2, -1, 0].map((s) => [subsessionId, s] as SessionKey);
}

// ---------------------------------------------------------------------------

describe('sessionKeyId', () => {
    it('renders a tuple as a stable id', () => {
        expect(sessionKeyId([86551649, -2])).toBe('86551649:-2');
        expect(sessionKeyId([86551649, 0])).toBe('86551649:0');
    });

    it('collapses -0 and 0 to the same id', () => {
        expect(sessionKeyId([86551649, -0])).toBe(sessionKeyId([86551649, 0]));
    });

    it('round-trips', () => {
        expect(parseSessionKeyId(sessionKeyId([86551649, -2]))).toEqual([
            86551649, -2,
        ]);
    });

    // The whole point: tuples compare by reference, so set membership has to
    // go through the id.
    it('supports set membership where the raw tuple cannot', () => {
        const set = new Set([sessionKeyId([86551649, -2])]);
        expect(set.has(sessionKeyId([86551649, -2]))).toBe(true);
        expect(new Set([[86551649, -2]]).has([86551649, -2])).toBe(false);
    });
});

describe('listRacedSessionKeys', () => {
    // Five resolved events × 5 sessions = 25 documents, but only 10 races.
    it('returns races only — 10 of the season’s 25 sessions', () => {
        const info = makeSeason();
        expect(listAllSessionKeys(info)).toHaveLength(25);
        expect(listRacedSessionKeys(info)).toHaveLength(10);
    });

    // The trap: heats score championship points at a negative session number.
    it('includes the heat at -2, not just the feature at 0', () => {
        const nums = listRacedSessionKeys(makeSeason()).map((k) => k[1]);
        expect(new Set(nums)).toEqual(new Set([-2, 0]));
    });

    it('excludes events with no resolved subsession', () => {
        const subs = new Set(
            listRacedSessionKeys(makeSeason()).map((k) => k[0])
        );
        expect(subs).toEqual(
            new Set([86551649, 86727453, 86905345, 87253846, 87426864])
        );
    });

    it('preserves calendar then session order', () => {
        expect(listRacedSessionKeys(makeSeason()).slice(0, 4)).toEqual([
            [86551649, -2],
            [86551649, 0],
            [86727453, -2],
            [86727453, 0],
        ]);
    });
});

describe('splitDriverRaceLedger', () => {
    const raced = new Set(listRacedSessionKeys(makeSeason()).map(sessionKeyId));

    // Real driver 532988: counted_races carries 25 entries — every session of
    // every resolved event — of which 10 are races.
    it('filters practice and qualifying out of counted_races', () => {
        const standing = makeStanding({
            starts: 10,
            counted_races: [
                ...allSessionsOf(86551649),
                ...allSessionsOf(86727453),
                ...allSessionsOf(86905345),
                ...allSessionsOf(87253846),
                ...allSessionsOf(87426864),
            ],
        });

        const ledger = splitDriverRaceLedger(standing, raced);
        expect(standing.counted_races).toHaveLength(25);
        expect(ledger.counted).toHaveLength(10);
        expect(ledger.unattributedStarts).toBe(0);
    });

    // dropped_races is always one whole event — five sessions, two races.
    it('counts a dropped event as 2 races, not 5 sessions', () => {
        const standing = makeStanding({
            starts: 10,
            counted_races: [
                ...allSessionsOf(86551649),
                ...allSessionsOf(86727453),
                ...allSessionsOf(86905345),
                ...allSessionsOf(87253846),
            ],
            dropped_races: allSessionsOf(87426864),
        });

        const ledger = splitDriverRaceLedger(standing, raced);
        expect(standing.dropped_races).toHaveLength(5);
        expect(ledger.dropped).toHaveLength(2);
        expect(ledger.counted).toHaveLength(8);
    });

    // Real driver 585611: 10 starts but only 8 races addressable — the 6th
    // scored event has no resolved subsession yet.
    it('reports starts that no session key accounts for', () => {
        const standing = makeStanding({
            starts: 10,
            counted_races: [
                ...allSessionsOf(86551649),
                ...allSessionsOf(86727453),
                ...allSessionsOf(86905345),
                ...allSessionsOf(87253846),
            ],
        });

        expect(splitDriverRaceLedger(standing, raced).unattributedStarts).toBe(
            2
        );
    });

    // Real driver 1088280: scored, but nothing is itemised at all.
    it('handles a driver with empty race lists', () => {
        const ledger = splitDriverRaceLedger(
            makeStanding({ starts: 2, counted_races: [], dropped_races: [] }),
            raced
        );
        expect(ledger.counted).toHaveLength(0);
        expect(ledger.unattributedStarts).toBe(2);
    });

    it('never reports negative unattributed starts', () => {
        const standing = makeStanding({
            starts: 0,
            counted_races: allSessionsOf(86551649),
        });
        expect(splitDriverRaceLedger(standing, raced).unattributedStarts).toBe(
            0
        );
    });
});

describe('reconcilePoints', () => {
    // 585611: standings say 144, the addressable rows sum to 122.
    it('reports the shortfall when races are missing', () => {
        const standing = makeStanding({ total_points: 144 });
        const rows = [
            makeRaceRow({ total_points: 60 }),
            makeRaceRow({ total_points: 62 }),
        ];
        expect(reconcilePoints(standing, rows)).toEqual({
            attributed: 122,
            unattributed: 22,
            isComplete: false,
        });
    });

    // 532988 reconciles exactly.
    it('reports complete when every point is accounted for', () => {
        const standing = makeStanding({ total_points: 135 });
        const rows = [
            makeRaceRow({ total_points: 100 }),
            makeRaceRow({ total_points: 35 }),
        ];
        expect(reconcilePoints(standing, rows)).toEqual({
            attributed: 135,
            unattributed: 0,
            isComplete: true,
        });
    });

    // Not-yet-loaded must not read as "measured zero".
    it('never fabricates attribution when detail is unloaded', () => {
        const r = reconcilePoints(makeStanding({ total_points: 29 }), null);
        expect(r).toEqual({
            attributed: 0,
            unattributed: 29,
            isComplete: false,
        });
    });

    it('sums negative race totals correctly', () => {
        const standing = makeStanding({ total_points: 1 });
        const rows = [
            makeRaceRow({ total_points: 5 }),
            makeRaceRow({ total_points: -4 }),
        ];
        expect(reconcilePoints(standing, rows).isComplete).toBe(true);
    });
});

describe('pointsBreakdown', () => {
    // Real driver 644931: 10 race + 1 bonus - 5 penalty = 6.
    it('treats penalty as a positive magnitude that subtracts', () => {
        const b = pointsBreakdown(
            makeStanding({
                race_points: 10,
                bonus_points: 1,
                penalty_points: 5,
                total_points: 6,
            })
        );
        expect(b.penalty).toBe(5);
        expect(b.penaltyDisplay).toBe('−5');
        expect(b.balances).toBe(true);
    });

    it('flags a breakdown that does not add up', () => {
        expect(
            pointsBreakdown(
                makeStanding({
                    race_points: 10,
                    bonus_points: 0,
                    penalty_points: 0,
                    total_points: 99,
                })
            ).balances
        ).toBe(false);
    });

    it('does not expose stage points', () => {
        expect(Object.keys(pointsBreakdown(makeStanding()))).not.toContain(
            'stage'
        );
    });
});

describe('positionDelta', () => {
    // position_previous -1 is a sentinel, and its position_change is garbage.
    it('reports a new entrant rather than a 15-place drop', () => {
        const d = positionDelta(
            makeStanding({ position_previous: -1, position_change: -15 })
        );
        expect(d).toEqual({ kind: 'new' });
        expect(JSON.stringify(d)).not.toContain('15');
    });

    it('reports a real movement', () => {
        expect(
            positionDelta(
                makeStanding({ position_previous: 2, position_change: 1 })
            )
        ).toEqual({ kind: 'change', change: 1 });
    });

    it('reports no movement as a change of 0', () => {
        expect(
            positionDelta(
                makeStanding({ position_previous: 5, position_change: 0 })
            )
        ).toEqual({ kind: 'change', change: 0 });
    });
});

describe('rankByPosition', () => {
    // The sample really does run … 17, 17, 19, 19, 21 …
    it('keeps tied positions and the gap that follows', () => {
        const out = rankByPosition([
            { position: 19, id: 'd' },
            { position: 17, id: 'a' },
            { position: 21, id: 'e' },
            { position: 17, id: 'b' },
            { position: 19, id: 'c' },
        ]);
        expect(out.map((r) => r.position)).toEqual([17, 17, 19, 19, 21]);
        expect(out.map((r) => r.isTied)).toEqual([
            true,
            true,
            true,
            true,
            false,
        ]);
    });

    it('does not renumber from the array index', () => {
        const out = rankByPosition([{ position: 17 }, { position: 17 }]);
        expect(out[1].position).toBe(17);
    });
});

describe('decodeHtmlEntities', () => {
    it('decodes the ampersand simracerhub leaves in team names', () => {
        expect(decodeHtmlEntities('Arrive &amp; Drive Racing')).toBe(
            'Arrive & Drive Racing'
        );
    });

    it('decodes quotes and angle brackets', () => {
        expect(decodeHtmlEntities('&quot;Fast&quot; &lt;Team&gt;')).toBe(
            '"Fast" <Team>'
        );
        expect(decodeHtmlEntities('O&#39;Brien')).toBe("O'Brien");
        expect(decodeHtmlEntities('O&#x27;Brien')).toBe("O'Brien");
    });

    // Double-decoding would turn an escaped entity into a live one.
    it('decodes in a single pass', () => {
        expect(decodeHtmlEntities('&amp;amp;')).toBe('&amp;');
    });

    it('leaves unknown entities alone', () => {
        expect(decodeHtmlEntities('50 &widget; 60')).toBe('50 &widget; 60');
    });
});

describe('formatSrhLapTime', () => {
    it('formats 10,000ths of a second', () => {
        expect(formatSrhLapTime(1153710)).toBe('1:55.371');
    });

    // -1 is the dataset's "no time set" sentinel and appears on real rows.
    it('returns null for every non-time', () => {
        for (const v of [-1, 0, null, undefined, NaN]) {
            expect(formatSrhLapTime(v as number)).toBeNull();
        }
    });

    it('never returns a negative-looking duration', () => {
        for (const v of [-1, -12345, -10000000]) {
            expect(formatSrhLapTime(v)).toBeNull();
        }
    });

    it('pads sub-10-second remainders', () => {
        expect(formatSrhLapTime(615000)).toBe('1:01.500');
    });
});

describe('srhRaceRating', () => {
    // 14 real non-starter rows carry rating 0 while every sibling analytic is
    // null — averaging those zeroes skews the field.
    it('suppresses the zero rating on a non-starter', () => {
        expect(
            srhRaceRating(
                makeRaceRow({
                    rating: 0,
                    passes: null,
                    quality_passes: null,
                    closing_passes: null,
                    avg_pos: null,
                    avg_running_pos: null,
                    num_fast_laps: null,
                    laps_completed: 0,
                    status: 'Disconnected',
                })
            )
        ).toBeNull();
    });

    it('keeps a measured rating', () => {
        expect(srhRaceRating(makeRaceRow({ rating: 83.0185 }))).toBe(83.0185);
    });

    it('keeps a genuine zero when the row was measured', () => {
        expect(srhRaceRating(makeRaceRow({ rating: 0, passes: 0 }))).toBe(0);
    });

    // Real row: cust 585611, subsession 86551649 session -2 — one lap, every
    // analytic null, but rating 88.1481. The rule is the row, not the value:
    // a rating off a single lap is not comparable to one earned over a race.
    it('suppresses a non-zero rating when nothing else was measured', () => {
        expect(
            srhRaceRating(
                makeRaceRow({
                    rating: 88.1481,
                    laps_completed: 1,
                    passes: null,
                    quality_passes: null,
                    closing_passes: null,
                    avg_pos: null,
                    avg_running_pos: null,
                    num_fast_laps: null,
                })
            )
        ).toBeNull();
    });
});

describe('seasonProgress', () => {
    it('counts resolved rounds against the full calendar', () => {
        const p = seasonProgress(makeSeason());
        expect(p.roundsRun).toBe(5);
        expect(p.roundsTotal).toBe(11);
        expect(p.racesRun).toBe(10);
    });

    // race_date is epoch seconds; forgetting the ×1000 dates the season to 1970.
    it('converts race_date from seconds to milliseconds', () => {
        const at = seasonProgress(makeSeason()).nextEventAt!;
        expect(new Date(at).getUTCFullYear()).toBe(2026);
    });

    it('reports no next event once the calendar is exhausted', () => {
        const info = makeSeason({ schedule: [makeEvent(86551649)] } as any);
        expect(seasonProgress(info).nextEventAt).toBeNull();
    });
});

describe('eventLabel', () => {
    // event_name is null on every event in the dataset.
    it('falls back to the track when the event is unnamed', () => {
        expect(
            eventLabel({ event_name: null, track: makeTrack() as any })
        ).toBe('Circuit de Spa-Francorchamps — Grand Prix Pits');
    });

    it('never renders null or undefined', () => {
        const label = eventLabel({
            event_name: null,
            track: { track_name: '', config_name: '' } as any,
        });
        expect(label).not.toMatch(/null|undefined/);
    });

    it('does not repeat a config already in the track name', () => {
        expect(
            eventLabel({
                event_name: null,
                track: {
                    track_name: 'Monza Grand Prix',
                    config_name: 'Grand Prix',
                } as any,
            })
        ).toBe('Monza Grand Prix');
    });
});

describe('buildSrhTeamRows', () => {
    const standings: any = {
        league_id: 4534,
        season_id: 134456,
        class_id: 0,
        drivers: {},
        teams: {
            '33999': {
                team_id: 33999,
                team_name: 'Arrive &amp; Drive Racing',
                position: 2,
                position_previous: 3,
                position_change: 1,
                total_points: 279,
                race_points: 270,
                bonus_points: 9,
                penalty_points: 0,
                starts: 20,
                wins: 3,
                podiums: 14,
                poles: 2,
                incidents: 40,
                races_counted: 50,
                cust_ids: [174470, 999999],
                is_provisional: false,
            },
            '33989': {
                team_id: 33989,
                team_name: 'Team One',
                position: 1,
                position_change: 0,
                total_points: 300,
                race_points: 300,
                bonus_points: 0,
                penalty_points: 0,
                starts: 20,
                wins: 5,
                podiums: 10,
                poles: 4,
                incidents: 20,
                races_counted: 50,
                cust_ids: [174470],
                is_provisional: false,
            },
        },
    };

    it('decodes team names and orders by position', () => {
        const rows = buildSrhTeamRows(standings, makeSeason());
        expect(rows.map((r) => r.position)).toEqual([1, 2]);
        expect(rows[1].teamName).toBe('Arrive & Drive Racing');
    });

    // Roster sums exceed anything a single driver ran — 14 podiums in a
    // 10-race season — so they must not share a name with driver stats.
    it('names roster totals distinctly from driver stats', () => {
        const row = buildSrhTeamRows(standings, makeSeason())[1];
        expect(row.rosterPodiums).toBe(14);
        expect(row).not.toHaveProperty('podiums');
        expect(row).not.toHaveProperty('wins');
    });

    it('resolves driver names, falling back to the id', () => {
        const row = buildSrhTeamRows(standings, makeSeason())[1];
        expect(row.driverNames).toEqual(['Arturo Mayorga', '#999999']);
    });

    it('returns nothing for a season with no team championship', () => {
        expect(buildSrhTeamRows({ ...standings, teams: {} }, null)).toEqual([]);
    });
});

describe('driverDisplay', () => {
    // sort_name is already "Last, First" — splitting display_name on
    // whitespace mis-handles multi-word surnames.
    it('prefers the comma form over splitting display_name', () => {
        expect(driverDisplay(174470, makeSeason())).toEqual({
            firstName: 'Arturo',
            lastName: 'Mayorga',
            countryCode: 'US',
        });
    });

    it('handles a multi-word surname via sort_name', () => {
        const info = makeSeason({
            drivers: {
                '1': {
                    cust_id: 1,
                    display_name: 'Juan de la Rosa',
                    sort_name: 'de la Rosa, Juan',
                    country_code: 'ES',
                },
            },
        } as any);
        expect(driverDisplay(1, info)).toMatchObject({
            firstName: 'Juan',
            lastName: 'de la Rosa',
        });
    });

    it('falls back to the id rather than rendering undefined', () => {
        expect(driverDisplay(999999, makeSeason())).toEqual({
            firstName: '',
            lastName: '#999999',
            countryCode: null,
        });
        expect(driverDisplay(999999, null).lastName).not.toMatch(/undefined/);
    });
});
