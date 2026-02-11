const { Op } = require('sequelize');
const { ProductImage } = require('../models');

function toPlain(row) {
    return row ? row.get({ plain: true }) : null;
}

async function createProductImage(data) {
    const created = await ProductImage.create({
        productId: data.productId,
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
    const rows = await ProductImage.findAll({
        where: { productId },
        order: [['sortOrder', 'ASC'], ['id', 'ASC']],
    });

    return rows.map(toPlain);
}

async function findProductImageById(productId, imageId) {
    const row = await ProductImage.findOne({
        where: { productId, id: imageId },
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

    const [count] = await ProductImage.update(update, {
        where: { productId, id: imageId },
    });

    if (!count) {
        return null;
    }

    return findProductImageById(productId, imageId);
}

async function deleteProductImage(productId, imageId) {
    const count = await ProductImage.destroy({
        where: { productId, id: imageId },
    });
    return count > 0;
}

async function fetchPrimaryImageUrls(productIds) {
    const ids = Array.from(new Set((productIds || []).filter(Boolean)));
    if (!ids.length) {
        return new Map();
    }

    const rows = await ProductImage.findAll({
        where: { productId: { [Op.in]: ids } },
        attributes: ['id', 'productId', 'publicUrl', 'sortOrder'],
        order: [['productId', 'ASC'], ['sortOrder', 'ASC'], ['id', 'ASC']],
    });

    const map = new Map();
    for (const row of rows) {
        const plain = row.get({ plain: true });
        if (!map.has(plain.productId)) {
            map.set(plain.productId, plain.publicUrl);
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

