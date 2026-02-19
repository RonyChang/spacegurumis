const test = require('node:test');
const assert = require('node:assert/strict');
const { Op } = require('sequelize');

const { OrderItem } = require('../src/models');
const catalogRepository = require('../src/repositories/catalog.repository');
const productImagesRepository = require('../src/repositories/productImages.repository');

test('fetchBestSellerHighlight filters out unpaid and cancelled orders at query level', async () => {
    const originalFindAll = OrderItem.findAll;
    const originalFetchPrimaryImageUrls = productImagesRepository.fetchPrimaryImageUrls;
    let capturedOptions = null;

    try {
        OrderItem.findAll = async (options) => {
            capturedOptions = options;
            return [];
        };
        productImagesRepository.fetchPrimaryImageUrls = async () => new Map();

        const result = await catalogRepository.fetchBestSellerHighlight();

        assert.equal(result, null);
        assert.ok(capturedOptions);
        const orderInclude = capturedOptions.include.find((item) => item.as === 'order');
        assert.ok(orderInclude);
        assert.equal(orderInclude.where.paymentStatus, 'approved');
        assert.equal(orderInclude.where.orderStatus[Op.ne], 'cancelled');
    } finally {
        OrderItem.findAll = originalFindAll;
        productImagesRepository.fetchPrimaryImageUrls = originalFetchPrimaryImageUrls;
    }
});

test('fetchBestSellerHighlight applies deterministic tie-break ordering', async () => {
    const originalFindAll = OrderItem.findAll;
    const originalFetchPrimaryImageUrls = productImagesRepository.fetchPrimaryImageUrls;
    let capturedOptions = null;

    try {
        OrderItem.findAll = async (options) => {
            capturedOptions = options;
            return [];
        };
        productImagesRepository.fetchPrimaryImageUrls = async () => new Map();

        await catalogRepository.fetchBestSellerHighlight();

        assert.ok(capturedOptions);
        assert.equal(Array.isArray(capturedOptions.order), true);
        assert.equal(capturedOptions.order.length, 3);
        assert.equal(capturedOptions.order[0][1], 'DESC');
        assert.equal(capturedOptions.order[1][1], 'DESC');
        assert.deepEqual(capturedOptions.order[2], ['productVariantId', 'ASC']);
    } finally {
        OrderItem.findAll = originalFindAll;
        productImagesRepository.fetchPrimaryImageUrls = originalFetchPrimaryImageUrls;
    }
});

test('fetchBestSellerHighlight returns render-safe data with primary image url', async () => {
    const originalFindAll = OrderItem.findAll;
    const originalFetchPrimaryImageUrls = productImagesRepository.fetchPrimaryImageUrls;

    try {
        OrderItem.findAll = async () => ([
            {
                productVariantId: 9,
                variant: {
                    id: 9,
                    sku: 'ALIEN-009',
                    variantName: 'Alien aqua',
                    product: {
                        id: 2,
                        name: 'Aliens',
                        slug: 'aliens',
                        category: {
                            id: 1,
                            name: 'Amigurumis',
                            slug: 'amigurumis',
                        },
                    },
                },
            },
        ]);
        productImagesRepository.fetchPrimaryImageUrls = async () => new Map([
            [9, 'https://assets.spacegurumis.lat/variants/alien-009/main.webp'],
        ]);

        const result = await catalogRepository.fetchBestSellerHighlight();

        assert.deepEqual(result, {
            variantId: 9,
            sku: 'ALIEN-009',
            variantName: 'Alien aqua',
            imageUrl: 'https://assets.spacegurumis.lat/variants/alien-009/main.webp',
            productId: 2,
            productName: 'Aliens',
            productSlug: 'aliens',
            categoryId: 1,
            categoryName: 'Amigurumis',
            categorySlug: 'amigurumis',
        });
    } finally {
        OrderItem.findAll = originalFindAll;
        productImagesRepository.fetchPrimaryImageUrls = originalFetchPrimaryImageUrls;
    }
});
