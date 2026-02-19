import React from 'react';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
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
        meta: {
            total: 1,
            page: 1,
            pageSize: 12,
            totalPages: 1,
            highlights: {
                bestSeller: {
                    sku: 'SKU-RED',
                    variantName: 'Rojo',
                    imageUrl: 'https://assets.spacegurumis.lat/variants/1/red.webp',
                    product: { id: 99, name: 'Amigurumi', slug: 'amigurumi' },
                    category: { id: 10, name: 'Peluche', slug: 'peluche' },
                },
            },
        },
    });
    listSiteAssetsBySlotMock.mockResolvedValue({
        data: [],
        message: 'OK',
        errors: [],
        meta: {},
    });
});

afterEach(() => {
    cleanup();
});

test('uses SSR initial data without duplicate first-load fetches', async () => {
    const variant = makeVariant({
        sku: 'SKU-SSR',
        variantName: 'SSR',
        imageUrl: 'https://assets.spacegurumis.lat/variants/ssr/main.webp',
    });

    render(
        <HomePage
            initialData={{
                catalog: {
                    variants: [variant],
                    page: 1,
                    totalPages: 1,
                    highlights: {
                        bestSeller: {
                            sku: 'SKU-SSR',
                            variantName: 'SSR',
                            imageUrl: 'https://assets.spacegurumis.lat/variants/ssr/main.webp',
                            product: { id: 1, name: 'Amigurumi', slug: 'amigurumi' },
                            category: { id: 2, name: 'Peluche', slug: 'peluche' },
                        },
                    },
                },
                slots: {
                    hero: [],
                },
            }}
        />
    );

    expect(listCatalogVariantsMock).not.toHaveBeenCalled();
    expect(listSiteAssetsBySlotMock).not.toHaveBeenCalled();
    const hero = screen.getByLabelText('Producto destacado');
    expect(await within(hero).findByRole('img', { name: 'Amigurumi - SSR' })).toHaveAttribute(
        'src',
        'https://assets.spacegurumis.lat/variants/ssr/main.webp'
    );
});

test('requests catalog highlights when loading on client fallback path', async () => {
    render(<HomePage />);

    await waitFor(() => {
        expect(listCatalogVariantsMock).toHaveBeenCalledTimes(1);
    });

    expect(listCatalogVariantsMock).toHaveBeenCalledWith({
        page: 1,
        pageSize: 12,
        includeHighlights: true,
    });
});

test('renders best-seller hero from highlight payload', async () => {
    render(<HomePage />);

    const hero = screen.getByLabelText('Producto destacado');
    const heroImage = await within(hero).findByRole('img', { name: 'Amigurumi - Rojo' });
    expect(heroImage).toHaveAttribute('src', 'https://assets.spacegurumis.lat/variants/1/red.webp');
    expect(screen.getByText('Mas vendido')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Rojo' })).toBeInTheDocument();
});

test('falls back to first catalog variant when highlight payload is missing', async () => {
    listCatalogVariantsMock.mockResolvedValueOnce({
        data: [makeVariant({ sku: 'SKU-FALLBACK', variantName: 'Verde' })],
        message: 'OK',
        errors: [],
        meta: { total: 1, page: 1, pageSize: 12, totalPages: 1, highlights: {} },
    });

    render(<HomePage />);

    const hero = screen.getByLabelText('Producto destacado');
    const heroImage = await within(hero).findByRole('img', { name: 'Amigurumi - Verde' });
    expect(heroImage).toHaveAttribute('src', 'https://assets.spacegurumis.lat/variants/1/red.webp');
    expect(screen.getByRole('heading', { level: 2, name: 'Verde' })).toBeInTheDocument();
    expect(screen.getByText('Destacado')).toBeInTheDocument();
});

test('falls back to local placeholder when no highlight and no catalog variants exist', async () => {
    listCatalogVariantsMock.mockResolvedValueOnce({
        data: [],
        message: 'OK',
        errors: [],
        meta: { total: 0, page: 1, pageSize: 12, totalPages: 0, highlights: {} },
    });

    render(<HomePage />);

    const heroImage = await screen.findByRole('img', { name: 'Coleccion principal de Spacegurumis' });
    expect(heroImage).toHaveAttribute('src', '/placeholder-product.svg');
    expect(screen.getByRole('heading', { level: 2, name: 'Coleccion Spacegurumis' })).toBeInTheDocument();
    expect(screen.getByText('Coleccion')).toBeInTheDocument();
});

test('home special-order CTA routes to instructions page instead of direct WhatsApp', async () => {
    render(<HomePage />);

    const specialOrdersCta = await screen.findByRole('link', { name: 'Pedidos especiales' });
    expect(specialOrdersCta).toHaveAttribute('href', '/special-orders');
    expect(specialOrdersCta).toHaveAttribute('data-nav-prefetch');
    expect(screen.queryByRole('link', { name: /whatsapp/i })).toBeNull();
    expect(
        screen.queryByText('Haz tu pedido aquí, contáctanos por wsp con tu pedido especial para cotizar :)')
    ).toBeNull();
});

test('decorative site-assets failure does not block best-seller hero flow', async () => {
    listSiteAssetsBySlotMock.mockRejectedValueOnce(new Error('network'));

    render(<HomePage />);

    const hero = screen.getByLabelText('Producto destacado');
    const heroImage = await within(hero).findByRole('img', { name: 'Amigurumi - Rojo' });
    expect(heroImage).toHaveAttribute('src', 'https://assets.spacegurumis.lat/variants/1/red.webp');
    expect(screen.getByRole('heading', { level: 2, name: 'Rojo' })).toBeInTheDocument();
    expect(listSiteAssetsBySlotMock).toHaveBeenCalledWith('home-hero');
});
