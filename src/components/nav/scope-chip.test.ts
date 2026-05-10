import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ScopeChip from './scope-chip.vue';
import type { ScopeDimension } from './scope-types';

const baseDimension: ScopeDimension = {
    key: 'league',
    label: 'League',
    selected: 'League Zero',
    options: [],
};

function mountChip(overrides: Partial<ScopeDimension> = {}, isOpen = false) {
    return mount(ScopeChip, {
        props: {
            dimension: { ...baseDimension, ...overrides },
            isOpen,
        },
    });
}

describe('ScopeChip', () => {
    it('renders the dimension selected value', () => {
        const wrapper = mountChip();
        expect(wrapper.find('.scope-chip__value').text()).toBe('League Zero');
    });

    it('marks aria-expanded based on isOpen', () => {
        expect(mountChip({}, false).attributes('aria-expanded')).toBe('false');
        expect(mountChip({}, true).attributes('aria-expanded')).toBe('true');
    });

    describe('modifier classes', () => {
        it('applies --open when isOpen is true', () => {
            expect(mountChip({}, true).classes()).toContain('scope-chip--open');
            expect(mountChip({}, false).classes()).not.toContain(
                'scope-chip--open'
            );
        });

        it('applies --secondary when priority is "secondary"', () => {
            expect(mountChip({ priority: 'secondary' }).classes()).toContain(
                'scope-chip--secondary'
            );
        });

        it('does not apply --secondary when priority is "primary" or unset', () => {
            expect(mountChip({ priority: 'primary' }).classes()).not.toContain(
                'scope-chip--secondary'
            );
            expect(mountChip().classes()).not.toContain(
                'scope-chip--secondary'
            );
        });

        it('applies --mono when mono is true', () => {
            expect(mountChip({ mono: true }).classes()).toContain(
                'scope-chip--mono'
            );
        });

        it('applies --truncate only when truncate is true', () => {
            expect(mountChip({ truncate: true }).classes()).toContain(
                'scope-chip--truncate'
            );
            expect(mountChip().classes()).not.toContain('scope-chip--truncate');
        });
    });

    describe('open emit', () => {
        it('emits "open" with the button element on click', async () => {
            const wrapper = mountChip();
            await wrapper.trigger('click');
            const emitted = wrapper.emitted('open');
            expect(emitted).toHaveLength(1);
            expect(emitted![0][0]).toBeInstanceOf(HTMLElement);
        });

        it('passes the button itself, not a child node', async () => {
            const wrapper = mountChip();
            await wrapper.trigger('click');
            const el = wrapper.emitted('open')![0][0] as HTMLElement;
            expect(el.tagName).toBe('BUTTON');
        });
    });
});
