import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import HomePage from './HomePage';

const listCatalogVariantsMock = vi.fn();
const getCatalogVariantDetailMock = vi.fn();
const addCartItemMock = vi.fn();
const writeGuestCartMock = vi.fn();

vi.mock('../../lib/api/catalog', () => ({
    listCatalogVariants: (...args: unknown[]) => listCatalogVariantsMock(...args),
    getCatalogVariantDetail: (...args: unknown[]) => getCatalogVariantDetailMock(...args),
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

function makeDetail(overrides: Record<string, unknown> = {}) {
    return {
        ...makeVariant(),
        product: { id: 99, name: 'Amigurumi', slug: 'amigurumi', description: 'Peluche tejido' },
        images: [
            {
                url: 'https://assets.spacegurumis.lat/variants/1/red-main.webp',
                altText: 'Principal',
                sortOrder: 0,
            },
            {
                url: 'https://assets.spacegurumis.lat/variants/1/red-side.webp',
                altText: 'Lateral',
                sortOrder: 1,
            },
        ],
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
    getCatalogVariantDetailMock.mockResolvedValue({
        data: makeDetail(),
        message: 'OK',
        errors: [],
        meta: {},
    });
});

afterEach(() => {
    cleanup();
});

test('renders catalog thumbnail using imageUrl when available', async () => {
    render(<HomePage />);

    const thumb = await screen.findByRole('img', { name: 'Amigurumi - Rojo' });
    expect(thumb).toHaveAttribute('src', 'https://assets.spacegurumis.lat/variants/1/red.webp');
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

test('renders gallery images after loading variant detail', async () => {
    const { container } = render(<HomePage />);

    const detailButton = await screen.findByRole('button', { name: 'Ver detalle' });
    fireEvent.click(detailButton);

    await waitFor(() => {
        expect(getCatalogVariantDetailMock).toHaveBeenCalledWith('SKU-RED');
    });

    await waitFor(() => {
        const main = container.querySelector('.gallery__main img');
        expect(main).toBeTruthy();
        expect(main).toHaveAttribute('src', 'https://assets.spacegurumis.lat/variants/1/red-main.webp');
    });

    const second = container.querySelector('.gallery__thumb[alt="Lateral"]');
    expect(second).toBeTruthy();
    expect(second).toHaveAttribute('src', 'https://assets.spacegurumis.lat/variants/1/red-side.webp');
});
