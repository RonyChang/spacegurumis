import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import HomePage from './HomePage';

const listCatalogVariantsMock = vi.fn();
const listSiteAssetsBySlotMock = vi.fn();
const addCartItemMock = vi.fn();
const writeGuestCartMock = vi.fn();

vi.mock('../../lib/api/catalog', () => ({
    listCatalogVariants: (...args: unknown[]) => listCatalogVariantsMock(...args),
}));

vi.mock('../../lib/api/siteAssets', () => ({
    listSiteAssetsBySlot: (...args: unknown[]) => listSiteAssetsBySlotMock(...args),
}));

vi.mock('../../lib/api/cart', () => ({
    addCartItem: (...args: unknown[]) => addCartItemMock(...args),
}));

vi.mock('../../lib/cart/guestCart', () => ({
    readGuestCart: () => [],
    writeGuestCart: (...args: unknown[]) => writeGuestCartMock(...args),
}));

function makeVariant(overrides: Record<string, unknown> = {}) {
    return {
        id: 1,
        sku: 'SKU-RED',
        variantName: 'Rojo',
        imageUrl: 'https://assets.spacegurumis.lat/variants/1/red.webp',
        price: 49.9,
        stockAvailable: 8,
        product: { id: 99, name: 'Amigurumi', slug: 'amigurumi' },
        category: { id: 10, name: 'Peluche', slug: 'peluche' },
        ...overrides,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    addCartItemMock.mockResolvedValue({});
    listCatalogVariantsMock.mockResolvedValue({
        data: [makeVariant()],
        message: 'OK',
        errors: [],
        meta: { total: 1, page: 1, pageSize: 9, totalPages: 1 },
    });
    listSiteAssetsBySlotMock.mockImplementation(async (slot: string) => ({
        data: [{
            id: slot === 'home-banner' ? 2 : 1,
            slot,
            title: slot === 'home-banner' ? 'Banner principal' : 'Hero principal',
            altText: slot === 'home-banner' ? 'Banner principal home' : 'Hero principal home',
            publicUrl: `https://assets.spacegurumis.lat/site/${slot}.webp`,
            sortOrder: 0,
        }],
        message: 'OK',
        errors: [],
        meta: {},
    }));
});

afterEach(() => {
    cleanup();
});

test('renders catalog thumbnail using imageUrl when available', async () => {
    render(<HomePage />);

    const thumb = await screen.findByRole('img', { name: 'Amigurumi - Rojo' });
    expect(thumb).toHaveAttribute('src', 'https://assets.spacegurumis.lat/variants/1/red.webp');
});

test('renders decorative assets from site-assets API', async () => {
    render(<HomePage />);

    const hero = await screen.findByRole('img', { name: 'Hero principal home' });
    expect(hero).toHaveAttribute('src', 'https://assets.spacegurumis.lat/site/home-hero.webp');

    const banner = await screen.findByRole('img', { name: 'Banner principal home' });
    expect(banner).toHaveAttribute('src', 'https://assets.spacegurumis.lat/site/home-banner.webp');
});

test('falls back to placeholder image when imageUrl is null', async () => {
    listCatalogVariantsMock.mockResolvedValueOnce({
        data: [makeVariant({ imageUrl: null })],
        message: 'OK',
        errors: [],
        meta: { total: 1, page: 1, pageSize: 9, totalPages: 1 },
    });

    render(<HomePage />);

    const thumb = await screen.findByRole('img', { name: 'Amigurumi - Rojo' });
    expect(thumb).toHaveAttribute('src', '/placeholder-product.svg');
});

test('detail action points to dedicated product detail route with sku query', async () => {
    render(<HomePage />);

    const detailLink = await screen.findByRole('link', { name: 'Ver detalle' });
    expect(detailLink).toHaveAttribute('href', '/products/amigurumi?sku=SKU-RED');
});

test('uses decorative fallback assets when site-assets API fails', async () => {
    listSiteAssetsBySlotMock.mockRejectedValueOnce(new Error('network'));
    listSiteAssetsBySlotMock.mockRejectedValueOnce(new Error('network'));

    render(<HomePage />);

    const hero = await screen.findByRole('img', { name: 'Coleccion destacada de amigurumis' });
    expect(hero).toHaveAttribute('src', '/site-fallback-hero.svg');

    const banner = await screen.findByRole('img', { name: 'Nuevos modelos de amigurumis' });
    expect(banner).toHaveAttribute('src', '/site-fallback-banner.svg');
});
