const { Op, fn, col } = require('sequelize');
const {
    Category,
    Product,
    ProductVariant,
    Inventory,
} = require('../models');
const productImagesRepository = require('./productImages.repository');

async function fetchActiveCategories() {
    const rows = await Category.findAll({
        where: { isActive: true },
        order: [['name', 'ASC']],
        attributes: ['id', 'name', 'slug'],
    });

    return rows.map((row) => row.get({ plain: true }));
}

// Construye filtros para el listado de productos.
function buildProductFilters(filters) {
    const productWhere = {
        isActive: true,
    };

    if (filters.q) {
        productWhere.name = { [Op.iLike]: `%${filters.q}%` };
    }

    const categoryWhere = filters.category ? { slug: filters.category } : null;

    return {
        productWhere,
        categoryWhere,
    };
}

// Construye filtros para el listado de variantes.
function buildVariantFilters(filters) {
    const variantWhere = {};

    if (filters.q) {
        variantWhere[Op.or] = [
            { variantName: { [Op.iLike]: `%${filters.q}%` } },
            { '$product.name$': { [Op.iLike]: `%${filters.q}%` } },
        ];
    }

    if (typeof filters.minPrice === 'number') {
        variantWhere.priceCents = { [Op.gte]: filters.minPrice };
    }

    if (typeof filters.maxPrice === 'number') {
        variantWhere.priceCents = {
            ...(variantWhere.priceCents || {}),
            [Op.lte]: filters.maxPrice,
        };
    }

    const productWhere = { isActive: true };
    const categoryWhere = filters.category ? { slug: filters.category } : null;

    return {
        variantWhere,
        productWhere,
        categoryWhere,
    };
}

async function fetchActiveProducts(filters, pagination) {
    const { productWhere, categoryWhere } = buildProductFilters(filters);
    const categoryInclude = {
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'slug'],
        required: true,
    };

    if (categoryWhere) {
        categoryInclude.where = categoryWhere;
    }

    const rows = await Product.findAll({
        where: productWhere,
        include: [
            categoryInclude,
            {
                model: ProductVariant,
                as: 'variants',
                attributes: [],
                required: false,
            },
        ],
        attributes: [
            'id',
            'name',
            'slug',
            [fn('COUNT', col('variants.id')), 'variantsCount'],
        ],
        group: [
            'Product.id',
            'Product.name',
            'Product.slug',
            'category.id',
            'category.name',
            'category.slug',
        ],
        order: [['name', 'ASC']],
        limit: pagination.pageSize,
        offset: (pagination.page - 1) * pagination.pageSize,
        subQuery: false,
    });

    return rows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        variantsCount: Number(row.get('variantsCount') || 0),
        categoryId: row.category ? row.category.id : null,
        categoryName: row.category ? row.category.name : null,
        categorySlug: row.category ? row.category.slug : null,
    }));
}

async function fetchActiveProductsCount(filters) {
    const { productWhere, categoryWhere } = buildProductFilters(filters);
    const categoryInclude = {
        model: Category,
        as: 'category',
        required: true,
    };

    if (categoryWhere) {
        categoryInclude.where = categoryWhere;
    }

    const total = await Product.count({
        where: productWhere,
        include: [categoryInclude],
        distinct: true,
        col: 'id',
    });

    return total || 0;
}

async function fetchActiveVariants(filters, pagination) {
    const { variantWhere, productWhere, categoryWhere } = buildVariantFilters(filters);
    const categoryInclude = {
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'slug'],
        required: true,
    };

    if (categoryWhere) {
        categoryInclude.where = categoryWhere;
    }

    const rows = await ProductVariant.findAll({
        where: variantWhere,
        include: [
            {
                model: Product,
                as: 'product',
                attributes: ['id', 'name', 'slug', 'description', 'categoryId'],
                where: productWhere,
                required: true,
                include: [categoryInclude],
            },
            {
                model: Inventory,
                as: 'inventory',
                attributes: ['stock', 'reserved'],
                required: false,
            },
        ],
        order: [
            [{ model: Product, as: 'product' }, 'name', 'ASC'],
            ['sku', 'ASC'],
        ],
        limit: pagination.pageSize,
        offset: (pagination.page - 1) * pagination.pageSize,
        subQuery: false,
    });

    const mapped = rows.map((row) => {
        const inventory = row.inventory || {};
        return {
            id: row.id,
            sku: row.sku,
            variantName: row.variantName,
            priceCents: row.priceCents,
            stock: inventory.stock || 0,
            reserved: inventory.reserved || 0,
            productId: row.product ? row.product.id : null,
            productName: row.product ? row.product.name : null,
            productSlug: row.product ? row.product.slug : null,
            categoryId: row.product && row.product.category ? row.product.category.id : null,
            categoryName: row.product && row.product.category ? row.product.category.name : null,
            categorySlug: row.product && row.product.category ? row.product.category.slug : null,
        };
    });

    const variantIds = mapped.map((item) => item.id).filter(Boolean);
    const primaryImageUrls = await productImagesRepository.fetchPrimaryImageUrls(variantIds);

    return mapped.map((item) => ({
        ...item,
        imageUrl: item.id ? primaryImageUrls.get(item.id) || null : null,
    }));
}

async function fetchActiveVariantsCount(filters) {
    const { variantWhere, productWhere, categoryWhere } = buildVariantFilters(filters);
    const categoryInclude = {
        model: Category,
        as: 'category',
        required: true,
    };

    if (categoryWhere) {
        categoryInclude.where = categoryWhere;
    }

    const total = await ProductVariant.count({
        where: variantWhere,
        include: [
            {
                model: Product,
                as: 'product',
                where: productWhere,
                required: true,
                include: [categoryInclude],
            },
        ],
        distinct: true,
        col: 'id',
    });

    return total || 0;
}

async function fetchProductBySlug(slug) {
    const product = await Product.findOne({
        where: { slug, isActive: true },
        include: [
            {
                model: Category,
                as: 'category',
                attributes: ['id', 'name', 'slug'],
                required: true,
            },
        ],
    });

    if (!product) {
        return null;
    }

    const firstVariant = await ProductVariant.findOne({
        where: { productId: product.id },
        attributes: ['id'],
        order: [['id', 'ASC']],
    });

    const images = firstVariant
        ? await productImagesRepository.listProductImages(firstVariant.id)
        : [];

    return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        categoryId: product.category ? product.category.id : null,
        categoryName: product.category ? product.category.name : null,
        categorySlug: product.category ? product.category.slug : null,
        images: images.map((img) => ({
            url: img.publicUrl,
            altText: img.altText || null,
            sortOrder: Number.isFinite(Number(img.sortOrder)) ? Number(img.sortOrder) : null,
        })),
    };
}

async function fetchVariantBySku(sku) {
    const variant = await ProductVariant.findOne({
        where: { sku },
        include: [
            {
                model: Product,
                as: 'product',
                attributes: ['id', 'name', 'slug', 'description', 'categoryId'],
                where: { isActive: true },
                required: true,
                include: [
                    {
                        model: Category,
                        as: 'category',
                        attributes: ['id', 'name', 'slug'],
                        required: true,
                    },
                ],
            },
            {
                model: Inventory,
                as: 'inventory',
                attributes: ['stock', 'reserved'],
                required: false,
            },
        ],
    });

    if (!variant) {
        return null;
    }

    const inventory = variant.inventory || {};

    return {
        id: variant.id,
        sku: variant.sku,
        variantName: variant.variantName,
        priceCents: variant.priceCents,
        stock: inventory.stock || 0,
        reserved: inventory.reserved || 0,
        productId: variant.product ? variant.product.id : null,
        productName: variant.product ? variant.product.name : null,
        productSlug: variant.product ? variant.product.slug : null,
        productDescription: variant.product ? variant.product.description : null,
        categoryId: variant.product && variant.product.category ? variant.product.category.id : null,
        categoryName: variant.product && variant.product.category
            ? variant.product.category.name
            : null,
        categorySlug: variant.product && variant.product.category
            ? variant.product.category.slug
            : null,
        images: (await productImagesRepository.listProductImages(variant.id)).map((img) => ({
            url: img.publicUrl,
            altText: img.altText || null,
            sortOrder: Number.isFinite(Number(img.sortOrder)) ? Number(img.sortOrder) : null,
        })),
    };
}

async function fetchProductVariants(productId) {
    const rows = await ProductVariant.findAll({
        where: { productId },
        include: [
            {
                model: Inventory,
                as: 'inventory',
                attributes: ['stock', 'reserved'],
                required: false,
            },
        ],
        order: [['id', 'ASC']],
    });

    return rows.map((row) => {
        const inventory = row.inventory || {};
        return {
            id: row.id,
            sku: row.sku,
            variantName: row.variantName,
            priceCents: row.priceCents,
            stock: inventory.stock || 0,
            reserved: inventory.reserved || 0,
        };
    });
}

module.exports = {
    fetchActiveCategories,
    fetchActiveProducts,
    fetchActiveProductsCount,
    fetchActiveVariants,
    fetchActiveVariantsCount,
    fetchProductBySlug,
    fetchVariantBySku,
    fetchProductVariants,
};
