import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import ProductDetailPage from './ProductDetailPage';

const getCatalogProductDetailMock = vi.fn();
const getCatalogVariantDetailMock = vi.fn();
const addCartItemMock = vi.fn();
const buildWhatsappProductMessageMock = vi.fn();
const buildWhatsappUrlMock = vi.fn();

vi.mock('../../lib/api/catalog', () => ({
    getCatalogProductDetail: (...args: unknown[]) => getCatalogProductDetailMock(...args),
    getCatalogVariantDetail: (...args: unknown[]) => getCatalogVariantDetailMock(...args),
}));

vi.mock('../../lib/api/cart', () => ({
    addCartItem: (...args: unknown[]) => addCartItemMock(...args),
}));

vi.mock('../../lib/cart/guestCart', () => ({
    readGuestCart: () => [],
    writeGuestCart: () => {},
}));

vi.mock('../../lib/whatsapp', () => ({
    buildWhatsappProductMessage: (...args: unknown[]) => buildWhatsappProductMessageMock(...args),
    buildWhatsappUrl: (...args: unknown[]) => buildWhatsappUrlMock(...args),
}));

function makeProductDetail(overrides: Record<string, unknown> = {}) {
    return {
        id: 99,
        name: 'Amigurumi',
        slug: 'amigurumi',
        description: 'Peluche tejido a mano',
        category: { id: 10, name: 'Peluche', slug: 'peluche' },
        images: [
            { url: 'https://assets.spacegurumis.lat/products/amigurumi/base.webp', altText: 'Base', sortOrder: 0 },
        ],
        variants: [
            { id: 1, sku: 'SKU-RED', variantName: 'Rojo', price: 49.9, stockAvailable: 8 },
            { id: 2, sku: 'SKU-BLUE', variantName: 'Azul', price: 52.5, stockAvailable: 3 },
        ],
        ...overrides,
    };
}

function makeVariantDetail(
    sku: string,
    variantName: string,
    overrides: Record<string, unknown> = {}
) {
    return {
        id: sku === 'SKU-BLUE' ? 2 : 1,
        sku,
        variantName,
        price: sku === 'SKU-BLUE' ? 52.5 : 49.9,
        stockAvailable: sku === 'SKU-BLUE' ? 3 : 8,
        imageUrl: null,
        product: { id: 99, name: 'Amigurumi', slug: 'amigurumi', description: 'Peluche tejido a mano' },
        category: { id: 10, name: 'Peluche', slug: 'peluche' },
        images: [
            {
                url: `https://assets.spacegurumis.lat/variants/${sku.toLowerCase()}/main.webp`,
                altText: `${variantName} principal`,
                sortOrder: 0,
            },
        ],
        ...overrides,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/products/amigurumi');

    getCatalogProductDetailMock.mockResolvedValue({
        data: makeProductDetail(),
        message: 'OK',
        errors: [],
        meta: {},
    });

    getCatalogVariantDetailMock.mockImplementation(async (sku: string) => ({
        data: sku === 'SKU-BLUE' ? makeVariantDetail('SKU-BLUE', 'Azul') : makeVariantDetail('SKU-RED', 'Rojo'),
        message: 'OK',
        errors: [],
        meta: {},
    }));

    addCartItemMock.mockResolvedValue({});
    buildWhatsappProductMessageMock.mockImplementation(({ productName, sku }: { productName: string; sku: string }) => (
        `Consulta ${productName} (${sku})`
    ));
    buildWhatsappUrlMock.mockImplementation((message: string) => `https://wa.me/51999999999?text=${encodeURIComponent(message)}`);
});

afterEach(() => {
    cleanup();
});

test('renders product detail page from slug endpoint', async () => {
    render(<ProductDetailPage slug="amigurumi" />);

    await screen.findByRole('heading', { name: 'Detalle de producto' });
    expect(getCatalogProductDetailMock).toHaveBeenCalledWith('amigurumi');
    await screen.findByText('Slug: amigurumi');
});

test('loads selected variant from sku query and updates selection when user switches variant', async () => {
    window.history.replaceState({}, '', '/products/amigurumi?sku=SKU-BLUE');
    render(<ProductDetailPage slug="amigurumi" />);

    await waitFor(() => {
        expect(getCatalogVariantDetailMock).toHaveBeenCalledWith('SKU-BLUE');
    });

    const redButton = await screen.findByRole('button', { name: 'Rojo' });
    fireEvent.click(redButton);

    await waitFor(() => {
        expect(getCatalogVariantDetailMock).toHaveBeenCalledWith('SKU-RED');
    });
    expect(window.location.search).toContain('sku=SKU-RED');
});

test('renders placeholder image when selected variant and product gallery are empty', async () => {
    getCatalogProductDetailMock.mockResolvedValueOnce({
        data: makeProductDetail({ images: [] }),
        message: 'OK',
        errors: [],
        meta: {},
    });
    getCatalogVariantDetailMock.mockResolvedValueOnce({
        data: makeVariantDetail('SKU-RED', 'Rojo', { images: [] }),
        message: 'OK',
        errors: [],
        meta: {},
    });

    render(<ProductDetailPage slug="amigurumi" />);

    const image = await screen.findByRole('img', { name: 'Amigurumi - Rojo' });
    expect(image).toHaveAttribute('src', '/placeholder-product.svg');
});

test('builds whatsapp CTA from selected variant context', async () => {
    render(<ProductDetailPage slug="amigurumi" />);

    const link = await screen.findByRole('link', { name: 'Consultar por WhatsApp' });
    expect(link).toHaveAttribute('href', 'https://wa.me/51999999999?text=Consulta%20Amigurumi%20-%20Rojo%20(SKU-RED)');

    expect(buildWhatsappProductMessageMock).toHaveBeenCalled();
    const calls = buildWhatsappProductMessageMock.mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall[0]).toMatchObject({ productName: 'Amigurumi - Rojo', sku: 'SKU-RED' });
});
