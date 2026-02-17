import { describe, expect, test, vi } from 'vitest';

import {
    createPrefetchController,
    initAcceleratedNavigation,
    isEligibleInternalLink,
} from './acceleratedNavigation';

function createLink(href: string) {
    const link = document.createElement('a');
    link.href = href;
    return link;
}

describe('acceleratedNavigation', () => {
    test('isEligibleInternalLink accepts same-origin routes and rejects external/hash/download/new-tab links', () => {
        const current = new URL('https://spacegurumis.lat/products');

        const internal = createLink('https://spacegurumis.lat/cart');
        const external = createLink('https://example.com/cart');
        const hashOnly = createLink('https://spacegurumis.lat/products#section');
        const downloadLink = createLink('https://spacegurumis.lat/catalog.csv');
        const blankTargetLink = createLink('https://spacegurumis.lat/orders');
        downloadLink.setAttribute('download', 'catalog.csv');
        blankTargetLink.setAttribute('target', '_blank');

        expect(isEligibleInternalLink(internal, current)?.pathname).toBe('/cart');
        expect(isEligibleInternalLink(external, current)).toBeNull();
        expect(isEligibleInternalLink(hashOnly, current)).toBeNull();
        expect(isEligibleInternalLink(downloadLink, current)).toBeNull();
        expect(isEligibleInternalLink(blankTargetLink, current)).toBeNull();
    });

    test('createPrefetchController deduplicates duplicate URLs', async () => {
        const prefetcher = vi.fn().mockResolvedValue(undefined);
        const controller = createPrefetchController(prefetcher);

        await Promise.all([
            controller.prefetch('https://spacegurumis.lat/cart'),
            controller.prefetch('https://spacegurumis.lat/cart'),
        ]);
        await controller.prefetch('https://spacegurumis.lat/cart#fragment');

        expect(prefetcher).toHaveBeenCalledTimes(1);
        expect(controller.hasPrefetched('https://spacegurumis.lat/cart')).toBe(true);
    });

    test('initAcceleratedNavigation prefetches eligible links and keeps fallback navigation intact', async () => {
        document.body.innerHTML = '<a href="/cart" data-nav-prefetch>Ir al carrito</a>';
        const link = document.querySelector('a[data-nav-prefetch]');
        expect(link).not.toBeNull();

        const prefetcher = vi.fn().mockResolvedValue(undefined);
        const cleanup = initAcceleratedNavigation({
            selector: 'a[data-nav-prefetch]',
            prefetcher,
            force: true,
        });

        link?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
        await Promise.resolve();
        expect(prefetcher).toHaveBeenCalledTimes(1);

        link?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(document.documentElement.classList.contains('is-route-transitioning')).toBe(true);

        window.dispatchEvent(new Event('pageshow'));
        expect(document.documentElement.classList.contains('is-route-transitioning')).toBe(false);

        cleanup();
    });

    test('default acceleration scope includes header links and home card CTA links', async () => {
        document.body.innerHTML = `
            <header class="site-header">
                <a href="/orders">Mis pedidos</a>
            </header>
            <section class="catalog">
                <a href="/products/alien?sku=ALIEN-001" data-nav-prefetch>Ver detalle</a>
            </section>
        `;

        const prefetcher = vi.fn().mockResolvedValue(undefined);
        const cleanup = initAcceleratedNavigation({
            prefetcher,
            force: true,
        });

        const headerLink = document.querySelector('.site-header a');
        const cardCtaLink = document.querySelector('.catalog a[data-nav-prefetch]');
        expect(headerLink).not.toBeNull();
        expect(cardCtaLink).not.toBeNull();

        headerLink?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
        cardCtaLink?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
        await Promise.resolve();

        const prefetchedUrls = prefetcher.mock.calls.map(([url]) => String(url));
        expect(prefetchedUrls.some((url) => url.endsWith('/orders'))).toBe(true);
        expect(
            prefetchedUrls.some((url) => url.includes('/products/alien?sku=ALIEN-001'))
        ).toBe(true);

        cleanup();
    });
});
