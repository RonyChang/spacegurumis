const catalogRepository = require('../repositories/catalog.repository');

// Convierte centimos a soles para las respuestas del API.
function centsToSoles(value) {
    if (value === null || value === undefined) {
        return null;
    }

    const cents = Number(value);
    if (Number.isNaN(cents)) {
        return null;
    }

    return Number((cents / 100).toFixed(2));
}

async function listCategories() {
    const rows = await catalogRepository.fetchActiveCategories();
    return rows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
    }));
}

async function listProducts(filters, pagination) {
    const [rows, total] = await Promise.all([
        catalogRepository.fetchActiveProducts(filters, pagination),
        catalogRepository.fetchActiveProductsCount(filters),
    ]);
    const items = rows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        variantsCount: row.variantsCount,
        category: {
            id: row.categoryId,
            name: row.categoryName,
            slug: row.categorySlug,
        },
    }));

    const totalPages = total === 0 ? 0 : Math.ceil(total / pagination.pageSize);

    return {
        items,
        meta: {
            total,
            page: pagination.page,
            pageSize: pagination.pageSize,
            totalPages,
        },
    };
}

function normalizeFacetTotal(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function buildSelectedFilters(filters) {
    return {
        category: filters.category || null,
        product: filters.product || null,
        minPrice: typeof filters.minPrice === 'number' ? centsToSoles(filters.minPrice) : null,
        maxPrice: typeof filters.maxPrice === 'number' ? centsToSoles(filters.maxPrice) : null,
    };
}

function buildFacetMeta(facets, filters) {
    const categories = Array.isArray(facets.categories) ? facets.categories : [];
    const products = Array.isArray(facets.products) ? facets.products : [];
    const priceRange = facets.priceRange || { minPriceCents: null, maxPriceCents: null };

    return {
        selected: buildSelectedFilters(filters),
        available: {
            categories: categories
                .map((item) => ({
                    slug: item.slug,
                    name: item.name,
                    total: normalizeFacetTotal(item.total),
                }))
                .filter((item) => item.slug && item.name)
                .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name)),
            products: products
                .map((item) => ({
                    slug: item.slug,
                    name: item.name,
                    categorySlug: item.categorySlug || null,
                    total: normalizeFacetTotal(item.total),
                }))
                .filter((item) => item.slug && item.name)
                .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name)),
            priceRange: {
                min: centsToSoles(priceRange.minPriceCents),
                max: centsToSoles(priceRange.maxPriceCents),
            },
        },
    };
}

async function listVariants(filters, pagination, options = {}) {
    const [rows, total] = await Promise.all([
        catalogRepository.fetchActiveVariants(filters, pagination),
        catalogRepository.fetchActiveVariantsCount(filters),
    ]);
    const items = rows.map((row) => {
        const stockAvailable = Math.max(row.stock - row.reserved, 0);

        return {
            id: row.id,
            sku: row.sku,
            variantName: row.variantName,
            price: centsToSoles(row.priceCents),
            stockAvailable,
            imageUrl: row.imageUrl || null,
            product: {
                id: row.productId,
                name: row.productName,
                slug: row.productSlug,
            },
            category: {
                id: row.categoryId,
                name: row.categoryName,
                slug: row.categorySlug,
            },
        };
    });

    const totalPages = total === 0 ? 0 : Math.ceil(total / pagination.pageSize);
    const meta = {
        total,
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalPages,
    };

    if (options.includeFacets) {
        const [categories, products, priceRange] = await Promise.all([
            catalogRepository.fetchVariantFacetCategories({
                ...filters,
                category: null,
                product: null,
            }),
            catalogRepository.fetchVariantFacetProducts({
                ...filters,
                product: null,
            }),
            catalogRepository.fetchVariantFacetPriceRange({
                ...filters,
                minPrice: null,
                maxPrice: null,
            }),
        ]);

        meta.filters = buildFacetMeta({ categories, products, priceRange }, filters);
    }

    return {
        items,
        meta,
    };
}

async function getProductBySlug(slug) {
    const productRow = await catalogRepository.fetchProductBySlug(slug);
    if (!productRow) {
        return null;
    }

    const variantRows = await catalogRepository.fetchProductVariants(productRow.id);
    const variants = variantRows.map((row) => {
        const stockAvailable = Math.max(row.stock - row.reserved, 0);

        return {
            id: row.id,
            sku: row.sku,
            variantName: row.variantName,
            price: centsToSoles(row.priceCents),
            stockAvailable,
        };
    });

    return {
        id: productRow.id,
        name: productRow.name,
        slug: productRow.slug,
        description: productRow.description,
        category: {
            id: productRow.categoryId,
            name: productRow.categoryName,
            slug: productRow.categorySlug,
        },
        images: Array.isArray(productRow.images) ? productRow.images : [],
        variants,
    };
}

async function getVariantBySku(sku) {
    const row = await catalogRepository.fetchVariantBySku(sku);
    if (!row) {
        return null;
    }

    const stockAvailable = Math.max(row.stock - row.reserved, 0);

    return {
        id: row.id,
        sku: row.sku,
        variantName: row.variantName,
        price: centsToSoles(row.priceCents),
        stockAvailable,
        product: {
            id: row.productId,
            name: row.productName,
            slug: row.productSlug,
            description: row.productDescription,
        },
        category: {
            id: row.categoryId,
            name: row.categoryName,
            slug: row.categorySlug,
        },
        images: Array.isArray(row.images) ? row.images : [],
    };
}

module.exports = {
    listCategories,
    listProducts,
    listVariants,
    getProductBySlug,
    getVariantBySku,
};
