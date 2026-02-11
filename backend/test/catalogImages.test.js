const test = require('node:test');
const assert = require('node:assert/strict');

const catalogController = require('../src/controllers/catalog.controller');
const catalogService = require('../src/services/catalog.service');
const catalogRepository = require('../src/repositories/catalog.repository');

function makeRes() {
    return {
        statusCode: 200,
        payload: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(value) {
            this.payload = value;
            return this;
        },
    };
}

test('catalog.controller.listVariants returns imageUrl in variant items', async () => {
    const originalListVariants = catalogService.listVariants;

    try {
        catalogService.listVariants = async () => ({
            items: [{
                id: 1,
                sku: 'SKU-1',
                variantName: 'Rojo',
                price: 89.9,
                stockAvailable: 5,
                imageUrl: 'https://assets.spacegurumis.lat/variants/1/a.webp',
                product: { id: 10, name: 'Amigurumi', slug: 'amigurumi' },
                category: { id: 20, name: 'Peluche', slug: 'peluche' },
            }],
            meta: { total: 1, page: 1, pageSize: 12, totalPages: 1 },
        });

        const req = { query: {} };
        const res = makeRes();
        const next = () => {
            throw new Error('next should not be called');
        };

        await catalogController.listVariants(req, res, next);

        assert.equal(res.statusCode, 200);
        assert.equal(res.payload.data[0].imageUrl, 'https://assets.spacegurumis.lat/variants/1/a.webp');
    } finally {
        catalogService.listVariants = originalListVariants;
    }
});

test('catalog.controller.getVariantDetail returns images array', async () => {
    const originalGetVariantBySku = catalogService.getVariantBySku;

    try {
        catalogService.getVariantBySku = async () => ({
            id: 1,
            sku: 'SKU-1',
            variantName: 'Rojo',
            price: 89.9,
            stockAvailable: 4,
            product: { id: 10, name: 'Amigurumi', slug: 'amigurumi', description: 'desc' },
            category: { id: 20, name: 'Peluche', slug: 'peluche' },
            images: [
                { url: 'https://assets.spacegurumis.lat/variants/1/a.webp', altText: 'A', sortOrder: 0 },
                { url: 'https://assets.spacegurumis.lat/variants/1/b.webp', altText: 'B', sortOrder: 1 },
            ],
        });

        const req = { params: { sku: 'SKU-1' } };
        const res = makeRes();
        const next = () => {
            throw new Error('next should not be called');
        };

        await catalogController.getVariantDetail(req, res, next);

        assert.equal(res.statusCode, 200);
        assert.equal(Array.isArray(res.payload.data.images), true);
        assert.equal(res.payload.data.images.length, 2);
        assert.equal(res.payload.data.images[0].url, 'https://assets.spacegurumis.lat/variants/1/a.webp');
    } finally {
        catalogService.getVariantBySku = originalGetVariantBySku;
    }
});

test('catalog.controller.getProductDetail returns non-empty ordered images array', async () => {
    const originalGetProductBySlug = catalogService.getProductBySlug;

    try {
        catalogService.getProductBySlug = async () => ({
            id: 10,
            name: 'Amigurumi',
            slug: 'amigurumi',
            description: 'desc',
            category: { id: 20, name: 'Peluche', slug: 'peluche' },
            images: [
                { url: 'https://assets.spacegurumis.lat/variants/1/a.webp', altText: 'A', sortOrder: 0 },
                { url: 'https://assets.spacegurumis.lat/variants/1/b.webp', altText: 'B', sortOrder: 1 },
            ],
            variants: [],
        });

        const req = { params: { slug: 'amigurumi' } };
        const res = makeRes();
        const next = () => {
            throw new Error('next should not be called');
        };

        await catalogController.getProductDetail(req, res, next);

        assert.equal(res.statusCode, 200);
        assert.equal(Array.isArray(res.payload.data.images), true);
        assert.equal(res.payload.data.images.length, 2);
        assert.deepEqual(res.payload.data.images.map((img) => img.sortOrder), [0, 1]);
    } finally {
        catalogService.getProductBySlug = originalGetProductBySlug;
    }
});

test('catalog.controller.getProductDetail includes variants summary for detail page selection', async () => {
    const originalGetProductBySlug = catalogService.getProductBySlug;

    try {
        catalogService.getProductBySlug = async () => ({
            id: 10,
            name: 'Amigurumi',
            slug: 'amigurumi',
            description: 'desc',
            category: { id: 20, name: 'Peluche', slug: 'peluche' },
            images: [{ url: 'https://assets.spacegurumis.lat/variants/1/a.webp', altText: 'A', sortOrder: 0 }],
            variants: [
                { id: 1, sku: 'SKU-RED', variantName: 'Rojo', price: 49.9, stockAvailable: 8 },
                { id: 2, sku: 'SKU-BLUE', variantName: 'Azul', price: 52.5, stockAvailable: 3 },
            ],
        });

        const req = { params: { slug: 'amigurumi' } };
        const res = makeRes();
        const next = () => {
            throw new Error('next should not be called');
        };

        await catalogController.getProductDetail(req, res, next);

        assert.equal(res.statusCode, 200);
        assert.equal(Array.isArray(res.payload.data.variants), true);
        assert.deepEqual(res.payload.data.variants.map((item) => item.sku), ['SKU-RED', 'SKU-BLUE']);
        assert.deepEqual(res.payload.data.variants.map((item) => item.stockAvailable), [8, 3]);
    } finally {
        catalogService.getProductBySlug = originalGetProductBySlug;
    }
});

test('catalog.controller.getProductDetail returns empty images array when gallery is unavailable', async () => {
    const originalGetProductBySlug = catalogService.getProductBySlug;

    try {
        catalogService.getProductBySlug = async () => ({
            id: 10,
            name: 'Amigurumi',
            slug: 'amigurumi',
            description: 'desc',
            category: { id: 20, name: 'Peluche', slug: 'peluche' },
            images: [],
            variants: [],
        });

        const req = { params: { slug: 'amigurumi' } };
        const res = makeRes();
        const next = () => {
            throw new Error('next should not be called');
        };

        await catalogController.getProductDetail(req, res, next);

        assert.equal(res.statusCode, 200);
        assert.equal(Array.isArray(res.payload.data.images), true);
        assert.equal(res.payload.data.images.length, 0);
    } finally {
        catalogService.getProductBySlug = originalGetProductBySlug;
    }
});

test('catalog.service falls back to [] for invalid images payloads', async () => {
    const originalFetchVariantBySku = catalogRepository.fetchVariantBySku;
    const originalFetchProductBySlug = catalogRepository.fetchProductBySlug;
    const originalFetchProductVariants = catalogRepository.fetchProductVariants;

    try {
        catalogRepository.fetchVariantBySku = async () => ({
            id: 1,
            sku: 'SKU-1',
            variantName: 'Rojo',
            priceCents: 4590,
            stock: 10,
            reserved: 2,
            productId: 99,
            productName: 'Amigurumi',
            productSlug: 'amigurumi',
            productDescription: 'desc',
            categoryId: 20,
            categoryName: 'Peluche',
            categorySlug: 'peluche',
            images: null,
        });
        catalogRepository.fetchProductBySlug = async () => ({
            id: 99,
            name: 'Amigurumi',
            slug: 'amigurumi',
            description: 'desc',
            categoryId: 20,
            categoryName: 'Peluche',
            categorySlug: 'peluche',
            images: null,
        });
        catalogRepository.fetchProductVariants = async () => [];

        const variant = await catalogService.getVariantBySku('SKU-1');
        const product = await catalogService.getProductBySlug('amigurumi');

        assert.deepEqual(variant.images, []);
        assert.deepEqual(product.images, []);
    } finally {
        catalogRepository.fetchVariantBySku = originalFetchVariantBySku;
        catalogRepository.fetchProductBySlug = originalFetchProductBySlug;
        catalogRepository.fetchProductVariants = originalFetchProductVariants;
    }
});
