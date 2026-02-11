const {
    Category,
    Product,
    ProductImage,
    ProductVariant,
    ProductVariantImage,
    Inventory,
    CartItem,
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

async function createCategory(payload, options = {}) {
    const row = await Category.create(payload, {
        transaction: options.transaction,
    });
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

async function deleteVariantScope(variantId, options = {}) {
    const transaction = options.transaction;

    const deletedVariantImages = await ProductVariantImage.destroy({
        where: { productVariantId: variantId },
        transaction,
    });
    const deletedInventories = await Inventory.destroy({
        where: { productVariantId: variantId },
        transaction,
    });
    const deletedCartItems = await CartItem.destroy({
        where: { productVariantId: variantId },
        transaction,
    });
    const deletedVariants = await ProductVariant.destroy({
        where: { id: variantId },
        transaction,
    });

    if (!deletedVariants) {
        return null;
    }

    return {
        deletedVariants,
        deletedVariantImages,
        deletedInventories,
        deletedCartItems,
    };
}

async function deleteProductScope(productId, options = {}) {
    const transaction = options.transaction;

    const variantRows = await ProductVariant.findAll({
        where: { productId },
        attributes: ['id'],
        transaction,
    });
    const variantIds = variantRows.map((row) => row.id);

    let deletedVariantImages = 0;
    let deletedInventories = 0;
    let deletedCartItems = 0;
    if (variantIds.length) {
        deletedVariantImages = await ProductVariantImage.destroy({
            where: { productVariantId: variantIds },
            transaction,
        });
        deletedInventories = await Inventory.destroy({
            where: { productVariantId: variantIds },
            transaction,
        });
        deletedCartItems = await CartItem.destroy({
            where: { productVariantId: variantIds },
            transaction,
        });
    }

    const deletedProductImages = await ProductImage.destroy({
        where: { productId },
        transaction,
    });
    const deletedVariants = await ProductVariant.destroy({
        where: { productId },
        transaction,
    });
    const deletedProducts = await Product.destroy({
        where: { id: productId },
        transaction,
    });

    if (!deletedProducts) {
        return null;
    }

    return {
        deletedProducts,
        deletedVariants,
        deletedProductImages,
        deletedVariantImages,
        deletedInventories,
        deletedCartItems,
    };
}

async function deleteCategoryScope(categoryId, options = {}) {
    const transaction = options.transaction;

    const productRows = await Product.findAll({
        where: { categoryId },
        attributes: ['id'],
        transaction,
    });
    const productIds = productRows.map((row) => row.id);

    let deletedProducts = 0;
    let deletedVariants = 0;
    let deletedProductImages = 0;
    let deletedVariantImages = 0;
    let deletedInventories = 0;
    let deletedCartItems = 0;

    if (productIds.length) {
        const variantRows = await ProductVariant.findAll({
            where: { productId: productIds },
            attributes: ['id'],
            transaction,
        });
        const variantIds = variantRows.map((row) => row.id);

        if (variantIds.length) {
            deletedVariantImages = await ProductVariantImage.destroy({
                where: { productVariantId: variantIds },
                transaction,
            });
            deletedInventories = await Inventory.destroy({
                where: { productVariantId: variantIds },
                transaction,
            });
            deletedCartItems = await CartItem.destroy({
                where: { productVariantId: variantIds },
                transaction,
            });
        }

        deletedProductImages = await ProductImage.destroy({
            where: { productId: productIds },
            transaction,
        });
        deletedVariants = await ProductVariant.destroy({
            where: { productId: productIds },
            transaction,
        });
        deletedProducts = await Product.destroy({
            where: { id: productIds },
            transaction,
        });
    }

    const deletedCategories = await Category.destroy({
        where: { id: categoryId },
        transaction,
    });

    if (!deletedCategories) {
        return null;
    }

    return {
        deletedCategories,
        deletedProducts,
        deletedVariants,
        deletedProductImages,
        deletedVariantImages,
        deletedInventories,
        deletedCartItems,
    };
}

module.exports = {
    listCategories,
    findCategoryById,
    createCategory,
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
    deleteVariantScope,
    deleteProductScope,
    deleteCategoryScope,
};
