import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import ProductDetailPage from './ProductDetailPage';

const getCatalogProductDetailMock = vi.fn();
const getCatalogVariantDetailMock = vi.fn();
const addCartItemMock = vi.fn();
const buildWhatsappProductMessageMock = vi.fn();
const buildWhatsappUrlMock = vi.fn();
const buildCatalogImageDeliveryUrlMock = vi.fn();

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

vi.mock('../../lib/media/imageDelivery', () => ({
    buildCatalogImageDeliveryUrl: (...args: unknown[]) => buildCatalogImageDeliveryUrlMock(...args),
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
    buildCatalogImageDeliveryUrlMock.mockImplementation((url: string, preset: string) => {
        if (!url || url.startsWith('/')) {
            return url;
        }

        const parsed = new URL(url);
        const key = parsed.pathname.replace(/^\/+/, '');
        return `https://img.spacegurumis.lat/${preset}/${key}`;
    });
});

afterEach(() => {
    cleanup();
});

test('renders product detail page from slug endpoint', async () => {
    render(<ProductDetailPage slug="amigurumi" />);

    await screen.findByText('SKU: SKU-RED');
    expect(getCatalogProductDetailMock).toHaveBeenCalledWith('amigurumi');
    expect(screen.getByRole('link', { name: 'Tienda' })).toHaveAttribute('href', '/shop');
});

test('uses SSR initial detail state without redundant first-load fetches', async () => {
    render(
        <ProductDetailPage
            slug="amigurumi"
            initialData={{
                product: makeProductDetail(),
                selectedSku: 'SKU-BLUE',
                selectedVariant: makeVariantDetail('SKU-BLUE', 'Azul'),
            }}
        />
    );

    await screen.findByText('SKU: SKU-BLUE');
    expect(getCatalogProductDetailMock).not.toHaveBeenCalled();
    expect(getCatalogVariantDetailMock).not.toHaveBeenCalled();
});

test('falls back deterministically to first available variant when SSR sku is invalid', async () => {
    render(
        <ProductDetailPage
            slug="amigurumi"
            initialData={{
                product: makeProductDetail(),
                selectedSku: 'SKU-UNKNOWN',
                selectedVariant: null,
            }}
        />
    );

    await waitFor(() => {
        expect(getCatalogVariantDetailMock).toHaveBeenCalledWith('SKU-RED');
    });
    expect(getCatalogProductDetailMock).not.toHaveBeenCalled();
    expect(window.location.search).toContain('sku=SKU-RED');
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
    expect(buildCatalogImageDeliveryUrlMock).not.toHaveBeenCalled();
});

test('uses detail preset for main gallery image and thumb preset for thumbnails', async () => {
    getCatalogVariantDetailMock.mockResolvedValueOnce({
        data: makeVariantDetail('SKU-RED', 'Rojo', {
            images: [
                {
                    url: 'https://assets.spacegurumis.lat/variants/sku-red/main.webp',
                    altText: 'Rojo principal',
                    sortOrder: 0,
                },
                {
                    url: 'https://assets.spacegurumis.lat/variants/sku-red/side.webp',
                    altText: 'Rojo lateral',
                    sortOrder: 1,
                },
            ],
        }),
        message: 'OK',
        errors: [],
        meta: {},
    });

    render(<ProductDetailPage slug="amigurumi" />);

    await screen.findByText('SKU: SKU-RED');

    await waitFor(() => {
        expect(buildCatalogImageDeliveryUrlMock).toHaveBeenCalledWith(
            'https://assets.spacegurumis.lat/variants/sku-red/main.webp',
            'detail'
        );
        expect(buildCatalogImageDeliveryUrlMock).toHaveBeenCalledWith(
            'https://assets.spacegurumis.lat/variants/sku-red/main.webp',
            'thumb'
        );
    });

    const mainImage = document.querySelector('.gallery__main img');
    expect(mainImage).not.toBeNull();
    expect(mainImage).toHaveAttribute(
        'src',
        'https://img.spacegurumis.lat/detail/variants/sku-red/main.webp'
    );

    const thumbButtons = screen.getAllByRole('button', { name: /Imagen \d de 2/ });
    const firstThumbImage = thumbButtons[0].querySelector('img');
    expect(firstThumbImage).not.toBeNull();
    expect(firstThumbImage).toHaveAttribute(
        'src',
        'https://img.spacegurumis.lat/thumb/variants/sku-red/main.webp'
    );
});

test('falls back from transformed URL to original URL when transformed image fails', async () => {
    render(<ProductDetailPage slug="amigurumi" />);

    await screen.findByText('SKU: SKU-RED');

    const mainImage = document.querySelector('.gallery__main img') as HTMLImageElement | null;
    expect(mainImage).not.toBeNull();
    if (!mainImage) {
        return;
    }

    expect(mainImage.getAttribute('src')).toBe(
        'https://img.spacegurumis.lat/detail/variants/sku-red/main.webp'
    );

    fireEvent.error(mainImage);
    expect(mainImage.getAttribute('src')).toBe(
        'https://assets.spacegurumis.lat/variants/sku-red/main.webp'
    );
});

test('falls back to placeholder when transformed and original URLs both fail', async () => {
    render(<ProductDetailPage slug="amigurumi" />);

    await screen.findByText('SKU: SKU-RED');

    const mainImage = document.querySelector('.gallery__main img') as HTMLImageElement | null;
    expect(mainImage).not.toBeNull();
    if (!mainImage) {
        return;
    }

    fireEvent.error(mainImage);
    fireEvent.error(mainImage);

    expect(mainImage.getAttribute('src')).toBe('/placeholder-product.svg');
});

test('keeps primary purchase flow usable when gallery falls back to placeholder', async () => {
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

    await screen.findByRole('img', { name: 'Amigurumi - Rojo' });
    expect(screen.getByRole('button', { name: 'Agregar al carrito' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Consultar por WhatsApp' })).toBeInTheDocument();
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
