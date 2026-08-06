import { describe, it, expect } from 'vitest';

import {
    buildAdjudicationLedger,
    observedDescriptions,
    getDefaultSrhRaceDetailModel,
} from './srh-race-detail-model';
import { sessionKeyId, listRacedSessionKeys } from './srh-standings-model';
import type {
    SeasonInfo,
    RaceAdjudications,
} from '@@/src/services/srhweb-types';

function makeEvent(subsessionId: number | null, raceDate = 1781755200) {
    return {
        subsession_id: subsessionId,
        sessions:
            subsessionId === null
                ? []
                : [
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
                          simsession_number: 0,
                          session_type: 'RACE',
                          is_race: true,
                      },
                  ],
        race_date: raceDate,
        track: {
            track_id: 103,
            config_id: 523,
            track_name: 'Spa',
            config_name: 'Grand Prix',
            length_km: 4.35,
            turns: 19,
        },
        event_name: null,
        is_chase: false,
        can_drop: true,
        counts_for_points: true,
    };
}

const INFO = {
    season_id: 134456,
    league_id: 4534,
    classes: [{ class_id: 0, class_name: 'Overall' }],
    schedule: [
        makeEvent(86551649, 1781755200),
        makeEvent(87253846, 1784174400),
    ],
    drivers: {
        '644931': {
            cust_id: 644931,
            display_name: 'Penalised Driver',
            sort_name: 'Driver, Penalised',
            country_code: 'US',
        },
        '585611': {
            cust_id: 585611,
            display_name: 'Fast Driver',
            sort_name: 'Driver, Fast',
            country_code: 'GB',
        },
    },
} as unknown as SeasonInfo;

const RACED = new Set(listRacedSessionKeys(INFO).map(sessionKeyId));

function adjDoc(
    subsession: number,
    simsession: number,
    penalties: any[] = [],
    bonuses: any[] = []
): RaceAdjudications {
    return {
        subsession_id: subsession,
        simsession_number: simsession,
        penalties,
        bonuses,
    } as RaceAdjudications;
}

describe('buildAdjudicationLedger', () => {
    // points is published as a positive magnitude on BOTH sides — the sign is
    // implied by which list the entry lands in.
    it('signs a penalty negative and a bonus positive', () => {
        const rows = buildAdjudicationLedger(
            [
                adjDoc(
                    87253846,
                    -2,
                    [
                        {
                            adjustment_id: 500266,
                            cust_id: 644931,
                            class_id: 0,
                            points: 5,
                            description: 'Major Penalty',
                        },
                    ],
                    [
                        {
                            adjustment_id: 2634532,
                            cust_id: 585611,
                            class_id: 0,
                            points: 1,
                            description: 'Fastest race lap',
                        },
                    ]
                ),
            ],
            INFO,
            RACED
        );

        const penalty = rows.find((r) => r.kind === 'penalty')!;
        const bonus = rows.find((r) => r.kind === 'bonus')!;
        expect(penalty.signedPoints).toBe(-5);
        expect(bonus.signedPoints).toBe(1);
    });

    // A qualifying session is not a steward decision about a race.
    it('drops adjustments filed against a non-race session', () => {
        const rows = buildAdjudicationLedger(
            [
                adjDoc(
                    86551649,
                    -3,
                    [],
                    [
                        {
                            adjustment_id: 1,
                            cust_id: 585611,
                            class_id: 0,
                            points: 1,
                            description: 'Pole position',
                        },
                    ]
                ),
            ],
            INFO,
            RACED
        );
        expect(rows).toHaveLength(0);
    });

    it('carries the description verbatim', () => {
        const rows = buildAdjudicationLedger(
            [
                adjDoc(
                    86551649,
                    0,
                    [],
                    [
                        {
                            adjustment_id: 1,
                            cust_id: 585611,
                            class_id: 0,
                            points: 1,
                            description: 'Fastest race lap',
                        },
                    ]
                ),
            ],
            INFO,
            RACED
        );
        expect(rows[0].description).toBe('Fastest race lap');
    });

    it('labels the round and event from the schedule', () => {
        const rows = buildAdjudicationLedger(
            [
                adjDoc(
                    87253846,
                    0,
                    [],
                    [
                        {
                            adjustment_id: 1,
                            cust_id: 585611,
                            class_id: 0,
                            points: 1,
                            description: 'Pole position',
                        },
                    ]
                ),
            ],
            INFO,
            RACED
        );
        expect(rows[0].round).toBe(2);
        expect(rows[0].eventLabel).toBe('Spa — Grand Prix');
        expect(rows[0].driverName).toBe('Fast Driver');
    });

    // The strongest available check: the ledger must reconcile against the
    // bonus_points / penalty_points the standings independently report.
    it('reconciles per driver with the standings totals', () => {
        const docs = [
            adjDoc(
                86551649,
                -2,
                [],
                [
                    {
                        adjustment_id: 1,
                        cust_id: 585611,
                        class_id: 0,
                        points: 1,
                        description: 'Fastest race lap',
                    },
                ]
            ),
            adjDoc(
                86551649,
                0,
                [],
                [
                    {
                        adjustment_id: 2,
                        cust_id: 585611,
                        class_id: 0,
                        points: 1,
                        description: 'Pole position',
                    },
                ]
            ),
            adjDoc(
                87253846,
                -2,
                [
                    {
                        adjustment_id: 3,
                        cust_id: 644931,
                        class_id: 0,
                        points: 5,
                        description: 'Major Penalty',
                    },
                ],
                [
                    {
                        adjustment_id: 4,
                        cust_id: 644931,
                        class_id: 0,
                        points: 1,
                        description: 'Fastest race lap',
                    },
                ]
            ),
        ];
        const rows = buildAdjudicationLedger(docs, INFO, RACED);

        const sum = (cust: number, kind: 'penalty' | 'bonus') =>
            rows
                .filter((r) => r.custId === cust && r.kind === kind)
                .reduce((t, r) => t + Math.abs(r.signedPoints), 0);

        // Standings for these two drivers: 585611 → 2 bonus / 0 penalty,
        // 644931 → 1 bonus / 5 penalty.
        expect(sum(585611, 'bonus')).toBe(2);
        expect(sum(585611, 'penalty')).toBe(0);
        expect(sum(644931, 'bonus')).toBe(1);
        expect(sum(644931, 'penalty')).toBe(5);
    });

    it('orders newest round first', () => {
        const rows = buildAdjudicationLedger(
            [
                adjDoc(
                    86551649,
                    0,
                    [],
                    [
                        {
                            adjustment_id: 1,
                            cust_id: 585611,
                            class_id: 0,
                            points: 1,
                            description: 'a',
                        },
                    ]
                ),
                adjDoc(
                    87253846,
                    0,
                    [],
                    [
                        {
                            adjustment_id: 2,
                            cust_id: 585611,
                            class_id: 0,
                            points: 1,
                            description: 'b',
                        },
                    ]
                ),
            ],
            INFO,
            RACED
        );
        expect(rows.map((r) => r.round)).toEqual([2, 1]);
    });

    // Most sessions have none — the empty case has to be reachable and calm.
    it('returns nothing for documents with no adjustments', () => {
        expect(
            buildAdjudicationLedger([adjDoc(86551649, 0)], INFO, RACED)
        ).toEqual([]);
    });
});

describe('observedDescriptions', () => {
    // Filter chips are built from what is present, never from a fixed list —
    // the vocabulary is whatever the league typed.
    it('lists the distinct reasons actually present', () => {
        const rows = [
            { description: 'Fastest race lap' },
            { description: 'Pole position' },
            { description: 'Fastest race lap' },
        ] as any;
        expect(observedDescriptions(rows)).toEqual([
            'Fastest race lap',
            'Pole position',
        ]);
    });
});

describe('getDefaultSrhRaceDetailModel', () => {
    // Three states must stay distinguishable, because they mean different
    // things to a reader: not loaded yet, loaded and genuinely empty, and
    // failed. Collapsing the last two would report a broken fetch as
    // "no adjustments this season".
    it('is marked unloaded, not failed, and carries nothing', () => {
        const m = getDefaultSrhRaceDetailModel();
        expect(m.loaded).toBe(false);
        expect(m.failed).toBe(false);
        expect(m.ledger).toEqual([]);
        expect(m.omittedRaces).toBe(0);
        expect(m.documentCount).toBe(0);
    });

    it('no longer carries race results — nothing reads them', () => {
        expect(getDefaultSrhRaceDetailModel()).not.toHaveProperty(
            'resultsByKey'
        );
    });
});

describe('session naming', () => {
    // iRacing numbers sessions backwards from the closing race, so simsession
    // -2 is the league's HEAT 1. Deriving the name from the number gives
    // "Heat 2" — off by the number of heats, and contradicting what the
    // league and ldata-irweb both call it.
    it('names simsession -2 as Heat 1, not Heat 2', () => {
        const rows = buildAdjudicationLedger(
            [
                adjDoc(
                    86551649,
                    -2,
                    [],
                    [
                        {
                            adjustment_id: 1,
                            cust_id: 585611,
                            class_id: 0,
                            points: 1,
                            description: 'Fastest race lap',
                        },
                    ]
                ),
            ],
            INFO,
            RACED
        );
        expect(rows[0].sessionLabel).toBe('Heat 1');
    });

    it('names the closing race Feature', () => {
        const rows = buildAdjudicationLedger(
            [
                adjDoc(
                    86551649,
                    0,
                    [],
                    [
                        {
                            adjustment_id: 2,
                            cust_id: 585611,
                            class_id: 0,
                            points: 1,
                            description: 'Pole position',
                        },
                    ]
                ),
            ],
            INFO,
            RACED
        );
        expect(rows[0].sessionLabel).toBe('Feature');
    });
});
