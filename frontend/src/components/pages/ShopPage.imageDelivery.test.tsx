import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import ShopPage from './ShopPage';

const listCatalogVariantsMock = vi.fn();
const buildCatalogImageDeliveryUrlMock = vi.fn();

vi.mock('../../lib/api/catalog', () => ({
    listCatalogVariants: (...args: unknown[]) => listCatalogVariantsMock(...args),
}));

vi.mock('../../lib/api/cart', () => ({
    addCartItem: vi.fn(),
}));

vi.mock('../../lib/cart/guestCart', () => ({
    readGuestCart: () => [],
    writeGuestCart: vi.fn(),
}));

vi.mock('../../lib/media/imageDelivery', () => ({
    buildCatalogImageDeliveryUrl: (...args: unknown[]) => buildCatalogImageDeliveryUrlMock(...args),
}));

function makeMeta() {
    return {
        total: 1,
        page: 1,
        pageSize: 9,
        totalPages: 1,
        filters: {
            selected: {
                category: null,
                product: null,
                minPrice: null,
                maxPrice: null,
            },
            available: {
                categories: [],
                products: [],
                priceRange: { min: 10, max: 80 },
            },
        },
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    buildCatalogImageDeliveryUrlMock.mockImplementation((url: string) => url);
});

afterEach(() => {
    cleanup();
});

test('uses API-provided card delivery URL in storefront cards', async () => {
    render(
        <ShopPage
            initialData={{
                variants: [{
                    id: 1,
                    sku: 'SKU-1',
                    variantName: 'Alien verde',
                    imageUrl: 'https://assets.spacegurumis.lat/variants/1/main.webp',
                    imageDeliveryUrls: {
                        thumb: 'https://img.spacegurumis.lat/thumb/variants/1/main.webp?exp=1&sig=1',
                        card: 'https://img.spacegurumis.lat/card/variants/1/main.webp?exp=1&sig=1',
                        detail: 'https://img.spacegurumis.lat/detail/variants/1/main.webp?exp=1&sig=1',
                    },
                    price: 30,
                    stockAvailable: 3,
                    product: { id: 1, name: 'Alien', slug: 'alien' },
                    category: { id: 1, name: 'Amigurumis', slug: 'amigurumis' },
                }],
                meta: makeMeta(),
            }}
        />
    );

    const image = await screen.findByRole('img', { name: 'Alien - Alien verde' });
    expect(image).toHaveAttribute('src', 'https://img.spacegurumis.lat/card/variants/1/main.webp?exp=1&sig=1');
    expect(buildCatalogImageDeliveryUrlMock).not.toHaveBeenCalled();
});

test('falls back to local card transform builder when API delivery URL is missing', async () => {
    buildCatalogImageDeliveryUrlMock.mockImplementation((url: string, preset: string) => {
        const parsed = new URL(url);
        const key = parsed.pathname.replace(/^\/+/, '');
        return `https://img.spacegurumis.lat/${preset}/${key}`;
    });

    render(
        <ShopPage
            initialData={{
                variants: [{
                    id: 1,
                    sku: 'SKU-1',
                    variantName: 'Alien verde',
                    imageUrl: 'https://assets.spacegurumis.lat/variants/1/main.webp',
                    price: 30,
                    stockAvailable: 3,
                    product: { id: 1, name: 'Alien', slug: 'alien' },
                    category: { id: 1, name: 'Amigurumis', slug: 'amigurumis' },
                }],
                meta: makeMeta(),
            }}
        />
    );

    const image = await screen.findByRole('img', { name: 'Alien - Alien verde' });
    expect(image).toHaveAttribute('src', 'https://img.spacegurumis.lat/card/variants/1/main.webp');
    expect(buildCatalogImageDeliveryUrlMock).toHaveBeenCalledWith(
        'https://assets.spacegurumis.lat/variants/1/main.webp',
        'card'
    );
});
