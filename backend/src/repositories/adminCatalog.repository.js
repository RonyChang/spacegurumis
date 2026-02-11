const {
    Category,
    Product,
    ProductVariant,
    Inventory,
} = require('../models');

function toPlain(row) {
    return row ? row.get({ plain: true }) : null;
}

async function listCategories() {
    const rows = await Category.findAll({
        order: [['name', 'ASC']],
        attributes: ['id', 'name', 'slug', 'isActive'],
    });

    return rows.map(toPlain);
}

async function findCategoryById(id) {
    const row = await Category.findByPk(id);
    return toPlain(row);
}

async function listProducts() {
    const rows = await Product.findAll({
        include: [
            {
                model: Category,
                as: 'category',
                attributes: ['id', 'name', 'slug', 'isActive'],
                required: false,
            },
            {
                model: ProductVariant,
                as: 'variants',
                required: false,
                include: [
                    {
                        model: Inventory,
                        as: 'inventory',
                        attributes: ['id', 'stock', 'reserved'],
                        required: false,
                    },
                ],
            },
        ],
        order: [
            ['id', 'DESC'],
            [{ model: ProductVariant, as: 'variants' }, 'id', 'ASC'],
        ],
    });

    return rows.map(toPlain);
}

async function findProductById(id) {
    const row = await Product.findByPk(id);
    return toPlain(row);
}

async function findVariantById(id) {
    const row = await ProductVariant.findByPk(id);
    return toPlain(row);
}

async function findInventoryByVariantId(productVariantId) {
    const row = await Inventory.findOne({ where: { productVariantId } });
    return toPlain(row);
}

async function createProduct(payload, options = {}) {
    const row = await Product.create(payload, {
        transaction: options.transaction,
    });
    return toPlain(row);
}

async function updateProduct(productId, patch, options = {}) {
    const [count] = await Product.update(patch, {
        where: { id: productId },
        transaction: options.transaction,
    });

    if (!count) {
        return null;
    }

    return findProductById(productId);
}

async function createVariant(payload, options = {}) {
    const row = await ProductVariant.create(payload, {
        transaction: options.transaction,
    });
    return toPlain(row);
}

async function updateVariant(variantId, patch, options = {}) {
    const [count] = await ProductVariant.update(patch, {
        where: { id: variantId },
        transaction: options.transaction,
    });

    if (!count) {
        return null;
    }

    return findVariantById(variantId);
}

async function createInventory(payload, options = {}) {
    const row = await Inventory.create(payload, {
        transaction: options.transaction,
    });
    return toPlain(row);
}

async function updateInventory(inventoryId, patch, options = {}) {
    const [count] = await Inventory.update(patch, {
        where: { id: inventoryId },
        transaction: options.transaction,
    });

    if (!count) {
        return null;
    }

    const row = await Inventory.findByPk(inventoryId, { transaction: options.transaction });
    return toPlain(row);
}

module.exports = {
    listCategories,
    findCategoryById,
    listProducts,
    findProductById,
    findVariantById,
    findInventoryByVariantId,
    createProduct,
    updateProduct,
    createVariant,
    updateVariant,
    createInventory,
    updateInventory,
};

