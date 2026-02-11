const { Op } = require('sequelize');
const { ProductVariantImage } = require('../models');

function toPlain(row) {
    return row ? row.get({ plain: true }) : null;
}

async function createProductImage(data) {
    const created = await ProductVariantImage.create({
        productVariantId: data.productVariantId,
        imageKey: data.imageKey,
        publicUrl: data.publicUrl,
        contentType: data.contentType,
        byteSize: data.byteSize,
        altText: data.altText || null,
        sortOrder: Number.isFinite(Number(data.sortOrder)) ? Number(data.sortOrder) : 0,
    });

    return toPlain(created);
}

async function listProductImages(productId) {
    const rows = await ProductVariantImage.findAll({
        where: { productVariantId: productId },
        order: [['sortOrder', 'ASC'], ['id', 'ASC']],
    });

    return rows.map(toPlain);
}

async function findProductImageById(productId, imageId) {
    const row = await ProductVariantImage.findOne({
        where: { productVariantId: productId, id: imageId },
    });
    return toPlain(row);
}

async function updateProductImage(productId, imageId, patch) {
    const update = {};
    if (Object.prototype.hasOwnProperty.call(patch, 'altText')) {
        update.altText = patch.altText === null ? null : String(patch.altText || '');
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'sortOrder')) {
        update.sortOrder = patch.sortOrder;
    }

    const [count] = await ProductVariantImage.update(update, {
        where: { productVariantId: productId, id: imageId },
    });

    if (!count) {
        return null;
    }

    return findProductImageById(productId, imageId);
}

async function deleteProductImage(productId, imageId) {
    const count = await ProductVariantImage.destroy({
        where: { productVariantId: productId, id: imageId },
    });
    return count > 0;
}

async function fetchPrimaryImageUrls(productIds) {
    const ids = Array.from(new Set((productIds || []).filter(Boolean)));
    if (!ids.length) {
        return new Map();
    }

    const rows = await ProductVariantImage.findAll({
        where: { productVariantId: { [Op.in]: ids } },
        attributes: ['id', 'productVariantId', 'publicUrl', 'sortOrder'],
        order: [['productVariantId', 'ASC'], ['sortOrder', 'ASC'], ['id', 'ASC']],
    });

    const map = new Map();
    for (const row of rows) {
        const plain = row.get({ plain: true });
        if (!map.has(plain.productVariantId)) {
            map.set(plain.productVariantId, plain.publicUrl);
        }
    }

    return map;
}

module.exports = {
    createProductImage,
    listProductImages,
    findProductImageById,
    updateProductImage,
    deleteProductImage,
    fetchPrimaryImageUrls,
};
