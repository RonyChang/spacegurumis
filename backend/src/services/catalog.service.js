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

async function listVariants(filters, pagination) {
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
    };
}

module.exports = {
    listCategories,
    listProducts,
    listVariants,
    getProductBySlug,
    getVariantBySku,
};
