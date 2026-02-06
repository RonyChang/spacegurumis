const catalogService = require('../services/catalog.service');

function getSingleValue(value) {
    return Array.isArray(value) ? value[0] : value;
}

function parseListParams(req) {
    // Normaliza query params y aplica valores por defecto.
    const rawPage = getSingleValue(req.query.page);
    const rawPageSize = getSingleValue(req.query.pageSize);

    const parsedPage = rawPage ? Number(rawPage) : NaN;
    const parsedPageSize = rawPageSize ? Number(rawPageSize) : NaN;

    const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
    const pageSize = Number.isNaN(parsedPageSize) || parsedPageSize < 1 ? 12 : parsedPageSize;

    const rawCategory = getSingleValue(req.query.category);
    const rawQuery = getSingleValue(req.query.q);
    const rawMinPrice = getSingleValue(req.query.minPrice);
    const rawMaxPrice = getSingleValue(req.query.maxPrice);

    const category = typeof rawCategory === 'string' ? rawCategory.trim() : '';
    const q = typeof rawQuery === 'string' ? rawQuery.trim() : '';

    const parsedMinPrice = rawMinPrice ? Number(rawMinPrice) : NaN;
    const parsedMaxPrice = rawMaxPrice ? Number(rawMaxPrice) : NaN;

    // Convierte soles a centimos para los filtros de precio.
    const minPriceCents = Number.isNaN(parsedMinPrice)
        ? null
        : Math.round(parsedMinPrice * 100);
    const maxPriceCents = Number.isNaN(parsedMaxPrice)
        ? null
        : Math.round(parsedMaxPrice * 100);

    return {
        page,
        pageSize,
        filters: {
            category: category ? category : null,
            q: q ? q : null,
            minPrice: minPriceCents,
            maxPrice: maxPriceCents,
        },
    };
}

async function listCategories(req, res, next) {
    try {
        const categories = await catalogService.listCategories();
        res.status(200).json({
            data: categories,
            message: 'OK',
            errors: [],
            meta: { total: categories.length },
        });
    } catch (error) {
        next(error);
    }
}

async function listProducts(req, res, next) {
    try {
        const { filters, page, pageSize } = parseListParams(req);
        const productFilters = {
            category: filters.category,
            q: filters.q,
            minPrice: null,
            maxPrice: null,
        };
        const { items, meta } = await catalogService.listProducts(productFilters, {
            page,
            pageSize,
        });
        res.status(200).json({
            data: items,
            message: 'OK',
            errors: [],
            meta,
        });
    } catch (error) {
        next(error);
    }
}

async function listVariants(req, res, next) {
    try {
        const { filters, page, pageSize } = parseListParams(req);
        const { items, meta } = await catalogService.listVariants(filters, {
            page,
            pageSize,
        });
        res.status(200).json({
            data: items,
            message: 'OK',
            errors: [],
            meta,
        });
    } catch (error) {
        next(error);
    }
}

async function getProductDetail(req, res, next) {
    try {
        const { slug } = req.params;
        const product = await catalogService.getProductBySlug(slug);
        if (!product) {
            return res.status(404).json({
                data: null,
                message: 'Producto no encontrado',
                errors: [{ message: 'Producto no encontrado' }],
                meta: {},
            });
        }

        res.status(200).json({
            data: product,
            message: 'OK',
            errors: [],
            meta: {},
        });
    } catch (error) {
        next(error);
    }
}

async function getVariantDetail(req, res, next) {
    try {
        const { sku } = req.params;
        const variant = await catalogService.getVariantBySku(sku);
        if (!variant) {
            return res.status(404).json({
                data: null,
                message: 'Variante no encontrada',
                errors: [{ message: 'Variante no encontrada' }],
                meta: {},
            });
        }

        res.status(200).json({
            data: variant,
            message: 'OK',
            errors: [],
            meta: {},
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    listCategories,
    listProducts,
    listVariants,
    getProductDetail,
    getVariantDetail,
};
