const {
    Category,
    CategoryImage,
    Product,
    ProductImage,
    ProductVariant,
} = require('../models');

function toPlain(row) {
    return row ? row.get({ plain: true }) : null;
}

async function findCategoryById(id) {
    const row = await Category.findByPk(id, {
        attributes: ['id', 'name', 'slug', 'isActive'],
    });
    return toPlain(row);
}

async function findProductById(id) {
    const row = await Product.findByPk(id, {
        attributes: ['id', 'categoryId', 'name', 'slug', 'isActive'],
    });
    return toPlain(row);
}

async function findVariantById(id) {
    const row = await ProductVariant.findByPk(id, {
        attributes: ['id', 'productId', 'sku', 'variantName'],
        include: [
            {
                model: Product,
                as: 'product',
                attributes: ['id', 'categoryId', 'name', 'slug'],
                required: true,
            },
        ],
    });

    return toPlain(row);
}

async function createCategoryImage(data, options = {}) {
    const row = await CategoryImage.create({
        categoryId: data.categoryId,
        imageKey: data.imageKey,
        publicUrl: data.publicUrl,
        contentType: data.contentType,
        byteSize: data.byteSize,
        altText: data.altText || null,
        sortOrder: data.sortOrder,
    }, {
        transaction: options.transaction,
    });

    return toPlain(row);
}

async function createProductImage(data, options = {}) {
    const row = await ProductImage.create({
        productId: data.productId,
        imageKey: data.imageKey,
        publicUrl: data.publicUrl,
        contentType: data.contentType,
        byteSize: data.byteSize,
        altText: data.altText || null,
        sortOrder: data.sortOrder,
    }, {
        transaction: options.transaction,
    });

    return toPlain(row);
}

async function listCategoryImages(categoryId) {
    const rows = await CategoryImage.findAll({
        where: { categoryId },
        order: [['sortOrder', 'ASC'], ['id', 'ASC']],
    });
    return rows.map(toPlain);
}

async function listProductImages(productId) {
    const rows = await ProductImage.findAll({
        where: { productId },
        order: [['sortOrder', 'ASC'], ['id', 'ASC']],
    });
    return rows.map(toPlain);
}

async function findCategoryImageById(categoryId, imageId) {
    const row = await CategoryImage.findOne({
        where: { id: imageId, categoryId },
    });
    return toPlain(row);
}

async function findProductImageById(productId, imageId) {
    const row = await ProductImage.findOne({
        where: { id: imageId, productId },
    });
    return toPlain(row);
}

async function updateCategoryImage(categoryId, imageId, patch, options = {}) {
    const [count] = await CategoryImage.update(patch, {
        where: { id: imageId, categoryId },
        transaction: options.transaction,
    });

    if (!count) {
        return null;
    }

    return findCategoryImageById(categoryId, imageId);
}

async function updateProductImage(productId, imageId, patch, options = {}) {
    const [count] = await ProductImage.update(patch, {
        where: { id: imageId, productId },
        transaction: options.transaction,
    });

    if (!count) {
        return null;
    }

    return findProductImageById(productId, imageId);
}

async function deleteCategoryImagesByCategory(categoryId, options = {}) {
    return CategoryImage.destroy({
        where: { categoryId },
        transaction: options.transaction,
    });
}

async function deleteProductImagesByProduct(productId, options = {}) {
    return ProductImage.destroy({
        where: { productId },
        transaction: options.transaction,
    });
}

async function deleteCategoryImage(categoryId, imageId, options = {}) {
    const count = await CategoryImage.destroy({
        where: { id: imageId, categoryId },
        transaction: options.transaction,
    });

    return count > 0;
}

async function deleteProductImage(productId, imageId, options = {}) {
    const count = await ProductImage.destroy({
        where: { id: imageId, productId },
        transaction: options.transaction,
    });

    return count > 0;
}

module.exports = {
    findCategoryById,
    findProductById,
    findVariantById,
    createCategoryImage,
    createProductImage,
    listCategoryImages,
    listProductImages,
    findCategoryImageById,
    findProductImageById,
    updateCategoryImage,
    updateProductImage,
    deleteCategoryImagesByCategory,
    deleteProductImagesByProduct,
    deleteCategoryImage,
    deleteProductImage,
};
