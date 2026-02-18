import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import ShopPage from './ShopPage';

const listCatalogVariantsMock = vi.fn();

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

function makeVariant(overrides: Record<string, unknown> = {}) {
    return {
        id: 1,
        sku: 'SKU-1',
        variantName: 'Alien verde',
        imageUrl: null,
        price: 34,
        stockAvailable: 8,
        product: { id: 1, name: 'Alien', slug: 'alien' },
        category: { id: 1, name: 'Amigurumis', slug: 'amigurumis' },
        ...overrides,
    };
}

function makeMeta(overrides: Record<string, unknown> = {}) {
    return {
        total: 3,
        page: 1,
        pageSize: 9,
        totalPages: 2,
        filters: {
            selected: {
                category: null,
                product: null,
                minPrice: null,
                maxPrice: null,
            },
            available: {
                categories: [
                    { slug: 'amigurumis', name: 'Amigurumis', total: 3 },
                    { slug: 'accesorios', name: 'Accesorios', total: 1 },
                ],
                products: [
                    { slug: 'alien', name: 'Alien', categorySlug: 'amigurumis', total: 2 },
                    { slug: 'ufo', name: 'UFO', categorySlug: 'amigurumis', total: 1 },
                ],
                priceRange: { min: 10, max: 80 },
            },
        },
        ...overrides,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    listCatalogVariantsMock.mockResolvedValue({
        data: [makeVariant()],
        message: 'OK',
        errors: [],
        meta: makeMeta({
            filters: {
                selected: {
                    category: 'amigurumis',
                    product: null,
                    minPrice: null,
                    maxPrice: null,
                },
                available: {
                    categories: [
                        { slug: 'amigurumis', name: 'Amigurumis', total: 3 },
                        { slug: 'accesorios', name: 'Accesorios', total: 1 },
                    ],
                    products: [
                        { slug: 'alien', name: 'Alien', categorySlug: 'amigurumis', total: 2 },
                    ],
                    priceRange: { min: 10, max: 80 },
                },
            },
        }),
    });
});

afterEach(() => {
    cleanup();
});

test('requests category filter against global catalog with includeFacets', async () => {
    render(
        <ShopPage
            initialData={{
                variants: [makeVariant()],
                meta: makeMeta(),
            }}
        />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Amigurumis (3)' }));

    await waitFor(() => {
        expect(listCatalogVariantsMock).toHaveBeenCalledTimes(1);
    });
    expect(listCatalogVariantsMock).toHaveBeenCalledWith(
        expect.objectContaining({
            page: 1,
            pageSize: 9,
            category: 'amigurumis',
            product: null,
            includeFacets: true,
        })
    );
});

test('requests product filter against global catalog with includeFacets', async () => {
    render(
        <ShopPage
            initialData={{
                variants: [makeVariant()],
                meta: makeMeta(),
            }}
        />
    );

    fireEvent.change(screen.getByLabelText('Selecciona un producto'), {
        target: { value: 'alien' },
    });

    await waitFor(() => {
        expect(listCatalogVariantsMock).toHaveBeenCalledTimes(1);
    });
    expect(listCatalogVariantsMock).toHaveBeenCalledWith(
        expect.objectContaining({
            page: 1,
            pageSize: 9,
            category: null,
            product: 'alien',
            includeFacets: true,
        })
    );
});

test('requests min/max price filters against global catalog', async () => {
    render(
        <ShopPage
            initialData={{
                variants: [makeVariant()],
                meta: makeMeta(),
            }}
        />
    );

    fireEvent.change(screen.getByLabelText('Mínimo (S/)'), {
        target: { value: '12.5' },
    });
    fireEvent.change(screen.getByLabelText('Máximo (S/)'), {
        target: { value: '40' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar precio' }));

    await waitFor(() => {
        expect(listCatalogVariantsMock).toHaveBeenCalledTimes(1);
    });
    expect(listCatalogVariantsMock).toHaveBeenCalledWith(
        expect.objectContaining({
            page: 1,
            pageSize: 9,
            category: null,
            product: null,
            minPrice: 12.5,
            maxPrice: 40,
            includeFacets: true,
        })
    );
});

test('keeps active filters when navigating pagination', async () => {
    render(
        <ShopPage
            initialData={{
                variants: [makeVariant()],
                meta: makeMeta({
                    page: 1,
                    filters: {
                        selected: {
                            category: 'amigurumis',
                            product: 'alien',
                            minPrice: 15,
                            maxPrice: 45,
                        },
                        available: {
                            categories: [{ slug: 'amigurumis', name: 'Amigurumis', total: 3 }],
                            products: [{ slug: 'alien', name: 'Alien', categorySlug: 'amigurumis', total: 2 }],
                            priceRange: { min: 10, max: 80 },
                        },
                    },
                }),
            }}
        />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

    await waitFor(() => {
        expect(listCatalogVariantsMock).toHaveBeenCalledTimes(1);
    });
    expect(listCatalogVariantsMock).toHaveBeenCalledWith(
        expect.objectContaining({
            page: 2,
            pageSize: 9,
            category: 'amigurumis',
            product: 'alien',
            minPrice: 15,
            maxPrice: 45,
            includeFacets: true,
        })
    );
});
