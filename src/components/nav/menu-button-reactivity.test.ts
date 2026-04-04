import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { ref, reactive, nextTick, defineComponent, h } from 'vue';

// ── Nuxt auto-import stubs ──────────────────────────────────────────
const mockUseAsyncData = vi.fn();
vi.stubGlobal('useAsyncData', mockUseAsyncData);
vi.stubGlobal('useAuthState', () => ({ isSignedIn: false }));

// ── Mock vue-clerk (renders slot content only) ──────────────────────
vi.mock('vue-clerk', () => ({
    SignedIn: defineComponent({
        setup(_, { slots }) {
            return () => (slots.default ? slots.default() : null);
        },
    }),
    SignedOut: defineComponent({
        setup(_, { slots }) {
            return () => (slots.default ? slots.default() : null);
        },
    }),
    RedirectToSignUp: defineComponent({
        setup() {
            return () => null;
        },
    }),
}));

// ── Mock the model functions to return controllable data ────────────
const mockGetTrackResultsMenuModel = vi.fn();
vi.mock('@@/src/models/nav/track-results-menu-model', () => ({
    getDefaultTrackResultsMenuModel: () => ({
        currentLeague: '',
        carOptions: { selected: '---', options: [] },
        trackOptions: { selected: '---', options: [] },
    }),
    getTrackResultsMenuModel: (...args: unknown[]) =>
        mockGetTrackResultsMenuModel(...args),
}));

// ── useAsyncData mock: behaves like Nuxt but runs synchronously ─────
function setupMockUseAsyncData() {
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

// Give async watch callbacks time to settle
async function flushWatchers(ms = 150) {
    await nextTick();
    await new Promise((r) => setTimeout(r, ms));
    await flushPromises();
    await nextTick();
}

// Helper: create a model based on car/track args (mirrors real model)
function makeTrackModel(league: string, car: string, track: string) {
    return {
        currentLeague: `League ${league}`,
        carOptions: {
            selected: `Car ${car}`,
            options: [
                {
                    display: `Car ${car}`,
                    href: `?m=track&league=${league}&car=${car}&track=${track}`,
                },
            ],
        },
        trackOptions: {
            selected: `Track ${track}`,
            options: [
                {
                    display: `Track ${track}`,
                    href: `?m=track&league=${league}&car=${car}&track=${track}`,
                },
            ],
        },
    };
}

const globalStubs = {
    RouterLink: {
        template: '<a><slot /></a>',
        props: ['to'],
    },
    RouterLinkProxy: {
        template: '<a :href="to" class="dropdown-item"><slot /></a>',
        props: ['to'],
    },
};

// ─────────────────────────────────────────────────────────────────────
// Test Suite: Menu buttons remain interactive after model updates
//
// track-results-menu.vue uses watchEffect + watch(props, ...) which
// both fire on prop changes. These tests verify the component stays
// reactive through multiple update cycles (the "works then stops" bug).
// ─────────────────────────────────────────────────────────────────────
describe('Menu button reactivity after model updates', () => {
    beforeEach(() => {
        mockUseAsyncData.mockReset();
        mockGetTrackResultsMenuModel.mockReset();
    });

    describe('track-results-menu', () => {
        it('renders dropdown items from initial model', async () => {
            setupMockUseAsyncData();
            // Use mockResolvedValue (persistent) since watchEffect
            // may fire multiple times
            mockGetTrackResultsMenuModel.mockResolvedValue({
                currentLeague: 'Test League',
                carOptions: {
                    selected: 'Mazda MX-5',
                    options: [
                        {
                            display: 'Mazda MX-5',
                            href: '?m=track&league=1&car=1&track=1',
                        },
                        {
                            display: 'BMW M4',
                            href: '?m=track&league=1&car=2&track=1',
                        },
                    ],
                },
                trackOptions: {
                    selected: 'Laguna Seca',
                    options: [
                        {
                            display: 'Laguna Seca',
                            href: '?m=track&league=1&car=1&track=1',
                        },
                    ],
                },
            });

            const { default: TrackResultsMenu } = await import(
                '@@/src/components/nav/track-results-menu.vue'
            );

            const wrapper = mount(TrackResultsMenu, {
                props: { league: '1', car: '1', track: '1' },
                global: { stubs: globalStubs },
            });

            await flushWatchers();

            const buttons = wrapper.findAll('.dropdown-toggle');
            expect(buttons.length).toBe(2);
            expect(buttons[0].text()).toBe('Mazda MX-5');
            expect(buttons[1].text()).toBe('Laguna Seca');

            const items = wrapper.findAll('.dropdown-item');
            expect(items.length).toBe(3);
        });

        it('dropdown items update after prop change triggers refetch', async () => {
            setupMockUseAsyncData();

            // Dynamic mock: returns model based on current args
            mockGetTrackResultsMenuModel.mockImplementation(
                async (league: string, car: string, track: string) =>
                    makeTrackModel(league, car, track)
            );

            const { default: TrackResultsMenu } = await import(
                '@@/src/components/nav/track-results-menu.vue'
            );

            const wrapper = mount(TrackResultsMenu, {
                props: { league: '1', car: '1', track: '1' },
                global: { stubs: globalStubs },
            });

            await flushWatchers();

            // Verify initial state
            expect(wrapper.find('.dropdown-toggle').text()).toBe('Car 1');

            // Simulate prop change (user navigated)
            await wrapper.setProps({ car: '2', track: '2' });
            await flushWatchers();

            // After refetch, the component should show updated data
            const buttons = wrapper.findAll('.dropdown-toggle');
            expect(buttons[0].text()).toBe('Car 2');
            expect(buttons[1].text()).toBe('Track 2');
        });

        it('dropdown items remain clickable through 5 rapid prop changes', async () => {
            setupMockUseAsyncData();

            // Track all calls to detect double-firing
            const callLog: string[] = [];
            mockGetTrackResultsMenuModel.mockImplementation(
                async (league: string, car: string, track: string) => {
                    callLog.push(`${league}-${car}-${track}`);
                    return makeTrackModel(league, car, track);
                }
            );

            const { default: TrackResultsMenu } = await import(
                '@@/src/components/nav/track-results-menu.vue'
            );

            const wrapper = mount(TrackResultsMenu, {
                props: { league: '1', car: '0', track: '0' },
                global: { stubs: globalStubs },
            });

            await flushWatchers();

            // Simulate 5 rapid navigation changes
            for (let i = 1; i <= 5; i++) {
                await wrapper.setProps({
                    car: String(i),
                    track: String(i),
                });
                await flushWatchers();
            }

            // After all updates, the last model should be rendered
            const buttons = wrapper.findAll('.dropdown-toggle');
            expect(buttons[0].text()).toBe('Car 5');
            expect(buttons[1].text()).toBe('Track 5');

            // Verify dropdown items exist and have correct hrefs
            const items = wrapper.findAll('.dropdown-item');
            expect(items.length).toBeGreaterThan(0);
            expect(items[0].attributes('href')).toContain('car=5');

            // Document: watchEffect + watch(props) causes double-
            // fetching on each prop change (a perf issue, not a
            // correctness bug, but worth noting).
            // Initial mount fires watchEffect once, then each
            // setProps fires both watchEffect and watch(props).
            // So we expect > 6 calls (1 init + 5*2 double-fires).
            expect(callLog.length).toBeGreaterThanOrEqual(6);
        });

        it('single prop change triggers exactly one fetch (no double-fetch)', async () => {
            // Verifies the fix: using watch(props, ..., { immediate })
            // instead of watchEffect + watch means each prop change
            // triggers exactly one refetch.
            setupMockUseAsyncData();

            let fetchCount = 0;
            mockGetTrackResultsMenuModel.mockImplementation(
                async (league: string, car: string, track: string) => {
                    fetchCount++;
                    return makeTrackModel(league, car, track);
                }
            );

            const { default: TrackResultsMenu } = await import(
                '@@/src/components/nav/track-results-menu.vue'
            );

            const wrapper = mount(TrackResultsMenu, {
                props: { league: '1', car: '1', track: '1' },
                global: { stubs: globalStubs },
            });

            await flushWatchers();
            const initialFetchCount = fetchCount;

            // Single prop change
            await wrapper.setProps({ car: '2' });
            await flushWatchers();

            const fetchesAfterOneChange = fetchCount - initialFetchCount;

            // After fix: exactly 1 fetch per prop change
            expect(fetchesAfterOneChange).toBe(1);

            expect(wrapper.findAll('.dropdown-toggle')[0].text()).toBe('Car 2');
        });
    });
});
