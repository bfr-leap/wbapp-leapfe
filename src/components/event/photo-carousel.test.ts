import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import PhotoCarousel from './photo-carousel.vue';

const disposeMock = vi.fn();

vi.mock('bootstrap/dist/js/bootstrap.bundle.min.js', () => ({
    // Must be a real function (not an arrow) so `new Carousel(...)` in
    // the component under test can construct it; returning an object
    // from a constructor call makes `new` yield that object instead
    // of `this`.
    Carousel: vi.fn().mockImplementation(function MockCarousel() {
        return { dispose: disposeMock };
    }),
}));

const PHOTOS = [
    { src: '/a.png', alt: 'A', caption: 'Battle' },
    { src: '/b.png', alt: 'B', caption: 'Overtake' },
    { src: '/c.png', alt: 'C' },
];

describe('PhotoCarousel', () => {
    it('renders nothing when there are no photos', () => {
        const wrapper = mount(PhotoCarousel, {
            props: { id: 'empty', photos: [] },
        });
        expect(wrapper.find('.photo-carousel').exists()).toBe(false);
    });

    it('renders a single photo with no indicators or controls', async () => {
        const wrapper = mount(PhotoCarousel, {
            props: { id: 'single', photos: [PHOTOS[0]] },
        });
        await flushPromises();
        expect(wrapper.findAll('.carousel-item')).toHaveLength(1);
        expect(wrapper.find('.carousel-item').classes()).toContain('active');
        expect(wrapper.find('.carousel-indicators').exists()).toBe(false);
        expect(wrapper.find('.carousel-control-prev').exists()).toBe(false);
        expect(wrapper.find('.carousel-control-next').exists()).toBe(false);
    });

    it('renders indicators and controls for multiple photos, first active', async () => {
        const wrapper = mount(PhotoCarousel, {
            props: { id: 'multi', photos: PHOTOS },
        });
        await flushPromises();
        const items = wrapper.findAll('.carousel-item');
        expect(items).toHaveLength(3);
        expect(items[0].classes()).toContain('active');
        expect(items[1].classes()).not.toContain('active');
        expect(wrapper.findAll('.carousel-indicators button')).toHaveLength(3);
        expect(wrapper.find('.carousel-control-prev').exists()).toBe(true);
        expect(wrapper.find('.carousel-control-next').exists()).toBe(true);
    });

    it('renders the caption when provided and omits it otherwise', async () => {
        const wrapper = mount(PhotoCarousel, {
            props: { id: 'captions', photos: PHOTOS },
        });
        await flushPromises();
        const items = wrapper.findAll('.carousel-item');
        expect(items[0].find('.carousel-caption').text()).toContain('Battle');
        expect(items[2].find('.carousel-caption').exists()).toBe(false);
    });

    it('drops a slide that fails to load without touching the others', async () => {
        const wrapper = mount(PhotoCarousel, {
            props: { id: 'fallback', photos: PHOTOS },
        });
        await flushPromises();
        await wrapper.findAll('img')[0].trigger('error');
        await flushPromises();
        const items = wrapper.findAll('.carousel-item');
        expect(items).toHaveLength(2);
        expect(items[0].find('img').attributes('src')).toBe('/b.png');
    });

    it('uses the id prop to target indicators/controls at the carousel', async () => {
        const wrapper = mount(PhotoCarousel, {
            props: { id: 'my-carousel-42', photos: PHOTOS },
        });
        await flushPromises();
        expect(wrapper.find('.photo-carousel').attributes('id')).toBe(
            'my-carousel-42'
        );
        expect(
            wrapper.find('.carousel-control-next').attributes('data-bs-target')
        ).toBe('#my-carousel-42');
    });
});
