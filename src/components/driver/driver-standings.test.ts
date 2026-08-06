import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent, h, ref, Suspense } from 'vue';

vi.mock('vue-clerk', () => ({
    useAuth: () => ({ isSignedIn: ref(false) }),
}));

const mockUseAsyncData = vi.fn();
vi.stubGlobal('useAsyncData', mockUseAsyncData);

import { asyncDataWithReactiveModel } from '@@/composables/async-data-with-reactive-model';
vi.stubGlobal('asyncDataWithReactiveModel', asyncDataWithReactiveModel);

vi.mock('@@/src/components/nav/router-link-proxy.vue', () => ({
    default: {
        name: 'RouterLinkProxy',
        props: ['to'],
        template: '<a><slot /></a>',
    },
}));
vi.mock('@@/src/components/driver/driver-tag.vue', () => ({
    default: {
        name: 'DriverTag',
        props: ['lastName', 'firstName', 'teamName', 'driverId'],
        template: '<span class="driver-tag-stub">{{ lastName }}</span>',
    },
}));
vi.mock('@@/src/components/team/team-tag.vue', () => ({
    default: { name: 'TeamTag', props: ['teamId'], template: '<span />' },
}));

vi.mock('@@/src/models/driver/driver-standings-model', async () => {
    const actual = await vi.importActual<any>(
        '@@/src/models/driver/driver-standings-model'
    );
    return {
        ...actual,
        getDriverStandingsModel: vi.fn(),
    };
});

import DriverStandings from './driver-standings.vue';
import {
    getDriverStandingsModel,
    getDefaultStandingsModel,
} from '@@/src/models/driver/driver-standings-model';

const fetchMock = vi.mocked(getDriverStandingsModel);

function driver(over: any = {}) {
    return {
        position: 1,
        points: 144,
        clubId: 1,
        lastName: 'Leader',
        firstName: 'The',
        iRating: '3000',
        licenseLevel: '20',
        safetyRating: '4.00',
        teamName: '',
        teamId: 0,
        showStats: false,
        custId: '174470',
        stats: {
            started: 10,
            poles: 1,
            wins: 5,
            podiums: 8,
            top10: 10,
            top20: -1,
        },
        pointsBehindLeader: 0,
        positionChange: 1,
        ...over,
    };
}

async function mountWith(model: any) {
    fetchMock.mockResolvedValue(model);
    mockUseAsyncData.mockImplementation(async (_key: string, fn: any) => {
        const result = await fn();
        return {
            data: ref(result),
            pending: ref(false),
            error: ref(null),
        };
    });

    const wrapper = mount(
        defineComponent({
            render: () =>
                h(Suspense, null, {
                    default: () =>
                        h(DriverStandings, {
                            league: '4534',
                            season: '134456',
                        }),
                }),
        })
    );
    await flushPromises();
    return wrapper;
}

beforeEach(() => {
    vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// The regression guard. A league that isn't on simracerhub must render exactly
// what it always did — this component is shared with the home page and the
// season profile in `summary_mode`, so a leak here shows up on three pages.
// ---------------------------------------------------------------------------
describe('DriverStandings — fallback league (no srh)', () => {
    it('keeps the original LEAP column labels', async () => {
        const w = await mountWith({
            ...getDefaultStandingsModel(),
            leagueId: '4534',
            seasonId: '131502',
            drivers: [driver()],
        });

        expect(w.text()).toContain('LEAP Ranking');
        expect(w.text()).toContain('LEAP Points');
        expect(w.text()).not.toContain('Pos');
    });

    it('renders none of the srhweb chrome', async () => {
        const w = await mountWith({
            ...getDefaultStandingsModel(),
            leagueId: '4534',
            seasonId: '131502',
            drivers: [driver()],
        });

        expect(w.find('.pts-bar').exists()).toBe(false);
        expect(w.find('.new-chip').exists()).toBe(false);
        expect(w.find('.srh-stats').exists()).toBe(false);
        expect(w.text()).not.toContain('Starts · W · Pod · Inc');
    });
});

describe('DriverStandings — srhweb league', () => {
    const srhFacts: any = {
        seasonName: 'Season 19',
        seriesName: 'Formula Series',
        leagueName: 'League Zero',
        dropWeeks: 1,
        keepWeeks: 4,
        classes: [{ class_id: 0, class_name: 'Overall' }],
        classId: 0,
        progress: {
            roundsRun: 5,
            roundsTotal: 11,
            racesRun: 10,
            nextEventAt: null,
        },
        schedule: [],
        teams: [],
        info: { schedule: [], drivers: {} },
    };

    function srhDriver(over: any = {}, srhOver: any = {}) {
        return driver({
            srh: {
                custId: 174470,
                isTied: false,
                points: {
                    race: 139,
                    bonus: 5,
                    penalty: 0,
                    penaltyDisplay: '0',
                    total: 144,
                    balances: true,
                },
                delta: { kind: 'change', change: 1 },
                counted: [],
                dropped: [],
                unattributedStarts: 0,
                starts: 10,
                racesCounted: 10,
                wins: 5,
                poles: 1,
                podiums: 8,
                top5: 9,
                top10: 10,
                lapsLed: 66,
                incidents: 12,
                seasonRating: 1353,
                ...srhOver,
            },
            ...over,
        });
    }

    it('relabels the columns away from the computed ranking', async () => {
        const w = await mountWith({
            ...getDefaultStandingsModel(),
            leagueId: '4534',
            seasonId: '134456',
            drivers: [srhDriver()],
            srh: srhFacts,
        });

        expect(w.text()).not.toContain('LEAP Ranking');
        expect(w.text()).not.toContain('LEAP Points');
        expect(w.text()).toContain('Pos');
    });

    it('renders the points breakdown bar', async () => {
        const w = await mountWith({
            ...getDefaultStandingsModel(),
            drivers: [srhDriver()],
            srh: srhFacts,
        });

        const bar = w.find('.pts-bar');
        expect(bar.exists()).toBe(true);
        // Bonus is 5 and penalty 0 — the penalty segment must not be drawn.
        expect(bar.find('.seg--bonus').exists()).toBe(true);
        expect(bar.find('.seg--penalty').exists()).toBe(false);
    });

    it('suppresses the bar when the parts do not sum to the total', async () => {
        const w = await mountWith({
            ...getDefaultStandingsModel(),
            drivers: [
                srhDriver(
                    {},
                    {
                        points: {
                            race: 10,
                            bonus: 0,
                            penalty: 0,
                            penaltyDisplay: '0',
                            total: 99,
                            balances: false,
                        },
                    }
                ),
            ],
            srh: srhFacts,
        });

        expect(w.find('.pts-bar').exists()).toBe(false);
    });

    // The whole reason positionDelta exists: a debutant carries a sentinel
    // position_change that would render as a large red drop.
    it('shows a NEW chip instead of a movement arrow for a debutant', async () => {
        const w = await mountWith({
            ...getDefaultStandingsModel(),
            drivers: [
                srhDriver(
                    { positionChange: undefined },
                    { delta: { kind: 'new' } }
                ),
            ],
            srh: srhFacts,
        });

        expect(w.find('.new-chip').exists()).toBe(true);
        expect(w.text()).toContain('NEW');
    });

    it('flags a driver whose starts are not all itemised', async () => {
        const w = await mountWith({
            ...getDefaultStandingsModel(),
            drivers: [srhDriver({}, { unattributedStarts: 2 })],
            srh: srhFacts,
        });

        expect(w.find('.unattributed').exists()).toBe(true);
        expect(w.find('.unattributed').text()).toContain('2');
    });

    it('does not flag a driver whose season reconciles', async () => {
        const w = await mountWith({
            ...getDefaultStandingsModel(),
            drivers: [srhDriver({}, { unattributedStarts: 0 })],
            srh: srhFacts,
        });

        expect(w.find('.unattributed').exists()).toBe(false);
    });
});
