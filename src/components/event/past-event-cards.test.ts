import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent, h, ref, Suspense } from 'vue';

vi.mock('vue-clerk', () => ({
    useAuth: () => ({ isSignedIn: ref(false) }),
}));

const mockUseAsyncData = vi.fn();
vi.stubGlobal('useAsyncData', mockUseAsyncData);

// `asyncDataWithReactiveModel` is exposed via Nuxt's auto-import in the app.
// Pull in the real implementation and expose it on globalThis so the
// component can resolve it the same way it does at runtime.
import { asyncDataWithReactiveModel } from '@@/composables/async-data-with-reactive-model';
vi.stubGlobal('asyncDataWithReactiveModel', asyncDataWithReactiveModel);

vi.mock('@@/src/components/event/event-card-past.vue', () => ({
    default: {
        name: 'EventCardPast',
        props: [
            'track_id',
            'date',
            'is_selected',
            'winner_name',
            'headline',
            'protagonist_finish',
        ],
        template:
            '<div class="event-card-past-stub" :data-winner="winner_name" :data-headline="headline">{{ track_id }}</div>',
    },
}));
vi.mock('@@/src/components/nav/router-link-proxy.vue', () => ({
    default: {
        name: 'RouterLinkProxy',
        props: ['to'],
        template: '<a><slot /></a>',
    },
}));

vi.mock('@@/src/models/event/past-events-cards-model', () => ({
    getPastEventCardsModel: vi.fn(),
    getDefaultPastEventCardsModel: () => ({ pastRaces: [] }),
}));
vi.mock('@@/src/models/driver/protagonist', () => ({
    resolveProtagonistCustId: vi.fn(async () => '174470'),
}));

import { getPastEventCardsModel } from '@@/src/models/event/past-events-cards-model';
const mockGetPastEventCardsModel = vi.mocked(getPastEventCardsModel);

import PastEventCards from './past-event-cards.vue';

function setupAsyncData() {
    mockUseAsyncData.mockImplementation(
        async (_key: string, fn: () => Promise<unknown>) => {
            const result = await fn();
            return {
                data: ref(result),
                pending: ref(false),
                error: ref(null),
            };
        }
    );
}

// PastEventCards uses top-level await in <script setup>, so it has an async
// setup. Wrap in <Suspense> so @vue/test-utils can mount it; we await
// flushPromises to let the async setup resolve.
const SuspenseWrapper = defineComponent({
    props: { league: String, season: String },
    setup(props) {
        return () =>
            h(Suspense, null, {
                default: () =>
                    h(PastEventCards, {
                        league: props.league,
                        season: props.season,
                    }),
            });
    },
});

async function flush() {
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
}

describe('PastEventCards — prop reactivity', () => {
    beforeEach(() => {
        mockUseAsyncData.mockReset();
        mockGetPastEventCardsModel.mockReset();
        setupAsyncData();
    });

    it('refetches and re-renders when the season prop changes', async () => {
        mockGetPastEventCardsModel.mockResolvedValueOnce({
            pastRaces: [
                {
                    sessionId: 's18-1',
                    simsessionId: '1',
                    trackId: '301',
                    date: '2026-04-01T00:00:00Z',
                    isSelected: false,
                },
            ],
        });

        const wrapper = mount(SuspenseWrapper, {
            props: { league: '4534', season: '131502' },
        });
        await flush();

        expect(mockGetPastEventCardsModel).toHaveBeenCalledTimes(1);
        expect(mockGetPastEventCardsModel).toHaveBeenLastCalledWith(
            '4534',
            '131502',
            '174470'
        );
        expect(wrapper.findAll('.event-card-past-stub')).toHaveLength(1);
        expect(wrapper.findAll('.event-card-past-stub')[0].text()).toBe('301');

        mockGetPastEventCardsModel.mockResolvedValueOnce({
            pastRaces: [
                {
                    sessionId: 's17-1',
                    simsessionId: '1',
                    trackId: '402',
                    date: '2025-10-01T00:00:00Z',
                    isSelected: false,
                },
                {
                    sessionId: 's17-2',
                    simsessionId: '1',
                    trackId: '403',
                    date: '2025-10-08T00:00:00Z',
                    isSelected: false,
                },
            ],
        });

        await wrapper.setProps({ league: '4534', season: '128679' });
        await flush();

        expect(mockGetPastEventCardsModel).toHaveBeenCalledTimes(2);
        expect(mockGetPastEventCardsModel).toHaveBeenLastCalledWith(
            '4534',
            '128679',
            '174470'
        );
        const chips = wrapper.findAll('.event-card-past-stub');
        expect(chips).toHaveLength(2);
        expect(chips.map((c) => c.text())).toEqual(['402', '403']);
    });

    it('passes winnerName and headline through to each card', async () => {
        mockGetPastEventCardsModel.mockResolvedValueOnce({
            pastRaces: [
                {
                    sessionId: 's18-1',
                    simsessionId: '1',
                    trackId: '301',
                    date: '2026-04-01T00:00:00Z',
                    isSelected: false,
                    winnerName: 'Adam Merchant',
                    headline: 'Merchant Devours Glen',
                },
            ],
        });

        const wrapper = mount(SuspenseWrapper, {
            props: { league: '4534', season: '131502' },
        });
        await flush();

        const card = wrapper.find('.event-card-past-stub');
        expect(card.attributes('data-winner')).toBe('Adam Merchant');
        expect(card.attributes('data-headline')).toBe('Merchant Devours Glen');
    });
});
