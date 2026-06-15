import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';

// Capture router.replace so we can assert whether the view bounces home.
const replaceMock = vi.fn();
vi.mock('vue-router', () => ({
    useRouter: () => ({ replace: replaceMock }),
}));

// Simulate the Clerk auth ref the way vue-clerk exposes it: `isLoaded`
// flips to true only after Clerk finishes hydrating on the client. Until
// then `isSignedIn` is false even for users who are actually signed in.
const authState = {
    isLoaded: ref(false),
    isSignedIn: ref(false),
};
vi.mock('vue-clerk', () => ({
    useAuth: () => authState,
    SignedIn: { name: 'SignedIn', template: '<div><slot /></div>' },
}));

// Stub the heavy admin component — we only care about the auth gate here.
vi.mock('@@/src/components/admin/season-cdr-admin.vue', () => ({
    default: {
        name: 'SeasonCdrAdmin',
        props: ['league', 'season'],
        template: '<div class="cdr-admin-stub" />',
    },
}));

import SeasonCdrAdminView from '@@/src/components/pages/season-cdr-admin-view.vue';

const props = { league: '4534', season: '131502' };

describe('season-cdr-admin-view — auth gate (Clerk hydration race)', () => {
    beforeEach(() => {
        replaceMock.mockReset();
        authState.isLoaded.value = false;
        authState.isSignedIn.value = false;
    });

    it('does NOT redirect home while Clerk is still loading', async () => {
        mount(SeasonCdrAdminView, { props });
        // Clerk hasn't resolved the session yet — bouncing now would kick
        // a signed-in user straight back to the home page.
        expect(replaceMock).not.toHaveBeenCalled();
    });

    it('redirects home only once Clerk has loaded and the user is signed out', async () => {
        const wrapper = mount(SeasonCdrAdminView, { props });
        authState.isLoaded.value = true; // Clerk finishes loading, signed out
        await wrapper.vm.$nextTick();
        expect(replaceMock).toHaveBeenCalledWith({ path: '' });
    });

    it('keeps a signed-in user on the page', async () => {
        authState.isLoaded.value = true;
        authState.isSignedIn.value = true;
        mount(SeasonCdrAdminView, { props });
        expect(replaceMock).not.toHaveBeenCalled();
    });
});
