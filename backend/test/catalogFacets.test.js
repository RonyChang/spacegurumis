const test = require('node:test');
const assert = require('node:assert/strict');

const catalogService = require('../src/services/catalog.service');
const catalogRepository = require('../src/repositories/catalog.repository');

test('listVariants includes global facets metadata when includeFacets is enabled', async () => {
    const originalFetchVariants = catalogRepository.fetchActiveVariants;
    const originalFetchCount = catalogRepository.fetchActiveVariantsCount;
    const originalFetchFacetCategories = catalogRepository.fetchVariantFacetCategories;
    const originalFetchFacetProducts = catalogRepository.fetchVariantFacetProducts;
    const originalFetchFacetPriceRange = catalogRepository.fetchVariantFacetPriceRange;
    const originalFetchBestSellerHighlight = catalogRepository.fetchBestSellerHighlight;

    try {
        catalogRepository.fetchActiveVariants = async () => ([{
            id: 1,
            sku: 'SKU-1',
            variantName: 'Rojo',
            priceCents: 3490,
            stock: 10,
            reserved: 2,
            imageUrl: 'https://assets.spacegurumis.lat/1.webp',
            productId: 5,
            productName: 'Alien',
            productSlug: 'alien',
            categoryId: 2,
            categoryName: 'Amigurumis',
            categorySlug: 'amigurumis',
        }]);
        catalogRepository.fetchActiveVariantsCount = async () => 13;
        catalogRepository.fetchVariantFacetCategories = async () => ([
            { slug: 'amigurumis', name: 'Amigurumis', total: 8 },
            { slug: 'accesorios', name: 'Accesorios', total: 5 },
        ]);
        catalogRepository.fetchVariantFacetProducts = async () => ([
            { slug: 'alien', name: 'Alien', categorySlug: 'amigurumis', total: 4 },
            { slug: 'ufo', name: 'UFO', categorySlug: 'amigurumis', total: 2 },
        ]);
        catalogRepository.fetchVariantFacetPriceRange = async () => ({
            minPriceCents: 1800,
            maxPriceCents: 5200,
        });
        catalogRepository.fetchBestSellerHighlight = async () => null;

        const result = await catalogService.listVariants(
            {
                category: 'amigurumis',
                product: 'alien',
                minPrice: 2000,
                maxPrice: 5000,
                q: null,
            },
            { page: 2, pageSize: 6 },
            { includeFacets: true }
        );

        assert.equal(result.items.length, 1);
        assert.equal(result.meta.total, 13);
        assert.equal(result.meta.totalPages, 3);
        assert.ok(result.meta.filters);
        assert.deepEqual(result.meta.filters.selected, {
            category: 'amigurumis',
            product: 'alien',
            minPrice: 20,
            maxPrice: 50,
        });
        assert.deepEqual(result.meta.filters.available.priceRange, {
            min: 18,
            max: 52,
        });
        assert.equal(result.meta.filters.available.categories.length, 2);
        assert.equal(result.meta.filters.available.products.length, 2);
    } finally {
        catalogRepository.fetchActiveVariants = originalFetchVariants;
        catalogRepository.fetchActiveVariantsCount = originalFetchCount;
        catalogRepository.fetchVariantFacetCategories = originalFetchFacetCategories;
        catalogRepository.fetchVariantFacetProducts = originalFetchFacetProducts;
        catalogRepository.fetchVariantFacetPriceRange = originalFetchFacetPriceRange;
        catalogRepository.fetchBestSellerHighlight = originalFetchBestSellerHighlight;
    }
});

test('listVariants skips facet queries when includeFacets is disabled', async () => {
    const originalFetchVariants = catalogRepository.fetchActiveVariants;
    const originalFetchCount = catalogRepository.fetchActiveVariantsCount;
    const originalFetchFacetCategories = catalogRepository.fetchVariantFacetCategories;
    const originalFetchFacetProducts = catalogRepository.fetchVariantFacetProducts;
    const originalFetchFacetPriceRange = catalogRepository.fetchVariantFacetPriceRange;
    const originalFetchBestSellerHighlight = catalogRepository.fetchBestSellerHighlight;

    let facetCalls = 0;
    let highlightCalls = 0;

    try {
        catalogRepository.fetchActiveVariants = async () => ([]);
        catalogRepository.fetchActiveVariantsCount = async () => 0;
        catalogRepository.fetchVariantFacetCategories = async () => {
            facetCalls += 1;
            return [];
        };
        catalogRepository.fetchVariantFacetProducts = async () => {
            facetCalls += 1;
            return [];
        };
        catalogRepository.fetchVariantFacetPriceRange = async () => {
            facetCalls += 1;
            return { minPriceCents: null, maxPriceCents: null };
        };
        catalogRepository.fetchBestSellerHighlight = async () => {
            highlightCalls += 1;
            return null;
        };

        const result = await catalogService.listVariants(
            { category: null, product: null, minPrice: null, maxPrice: null, q: null },
            { page: 1, pageSize: 9 },
            { includeFacets: false }
        );

        assert.equal(result.meta.totalPages, 0);
        assert.equal(result.meta.filters, undefined);
        assert.equal(result.meta.highlights, undefined);
        assert.equal(facetCalls, 0);
        assert.equal(highlightCalls, 0);
    } finally {
        catalogRepository.fetchActiveVariants = originalFetchVariants;
        catalogRepository.fetchActiveVariantsCount = originalFetchCount;
        catalogRepository.fetchVariantFacetCategories = originalFetchFacetCategories;
        catalogRepository.fetchVariantFacetProducts = originalFetchFacetProducts;
        catalogRepository.fetchVariantFacetPriceRange = originalFetchFacetPriceRange;
        catalogRepository.fetchBestSellerHighlight = originalFetchBestSellerHighlight;
    }
});

test('listVariants includes safe best-seller highlight when includeHighlights is enabled', async () => {
    const originalFetchVariants = catalogRepository.fetchActiveVariants;
    const originalFetchCount = catalogRepository.fetchActiveVariantsCount;
    const originalFetchBestSellerHighlight = catalogRepository.fetchBestSellerHighlight;
    const originalFetchFacetCategories = catalogRepository.fetchVariantFacetCategories;
    const originalFetchFacetProducts = catalogRepository.fetchVariantFacetProducts;
    const originalFetchFacetPriceRange = catalogRepository.fetchVariantFacetPriceRange;

    try {
        catalogRepository.fetchActiveVariants = async () => ([{
            id: 4,
            sku: 'ALIEN-004',
            variantName: 'Alien verde',
            priceCents: 4100,
            stock: 12,
            reserved: 1,
            imageUrl: 'https://assets.spacegurumis.lat/variants/alien-004/main.webp',
            productId: 3,
            productName: 'Aliens',
            productSlug: 'aliens',
            categoryId: 2,
            categoryName: 'Catalogo',
            categorySlug: 'catalogo',
        }]);
        catalogRepository.fetchActiveVariantsCount = async () => 1;
        catalogRepository.fetchVariantFacetCategories = async () => [];
        catalogRepository.fetchVariantFacetProducts = async () => [];
        catalogRepository.fetchVariantFacetPriceRange = async () => ({
            minPriceCents: null,
            maxPriceCents: null,
        });
        catalogRepository.fetchBestSellerHighlight = async () => ({
            sku: 'ALIEN-004',
            variantName: 'Alien verde',
            imageUrl: 'https://assets.spacegurumis.lat/variants/alien-004/main.webp',
            productId: 3,
            productName: 'Aliens',
            productSlug: 'aliens',
            categoryId: 2,
            categoryName: 'Catalogo',
            categorySlug: 'catalogo',
            soldUnits: 42,
            revenueCents: 172200,
        });

        const result = await catalogService.listVariants(
            { category: null, product: null, minPrice: null, maxPrice: null, q: null },
            { page: 1, pageSize: 12 },
            { includeHighlights: true }
        );

        assert.ok(result.meta.highlights);
        assert.deepEqual(result.meta.highlights.bestSeller, {
            sku: 'ALIEN-004',
            variantName: 'Alien verde',
            imageUrl: 'https://assets.spacegurumis.lat/variants/alien-004/main.webp',
            imageDeliveryUrls: null,
            product: {
                id: 3,
                name: 'Aliens',
                slug: 'aliens',
            },
            category: {
                id: 2,
                name: 'Catalogo',
                slug: 'catalogo',
            },
        });
        assert.equal('soldUnits' in result.meta.highlights.bestSeller, false);
        assert.equal('revenueCents' in result.meta.highlights.bestSeller, false);
    } finally {
        catalogRepository.fetchActiveVariants = originalFetchVariants;
        catalogRepository.fetchActiveVariantsCount = originalFetchCount;
        catalogRepository.fetchBestSellerHighlight = originalFetchBestSellerHighlight;
        catalogRepository.fetchVariantFacetCategories = originalFetchFacetCategories;
        catalogRepository.fetchVariantFacetProducts = originalFetchFacetProducts;
        catalogRepository.fetchVariantFacetPriceRange = originalFetchFacetPriceRange;
    }
});
