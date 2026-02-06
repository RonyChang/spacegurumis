const {
    Cart,
    CartItem,
    Product,
    ProductVariant,
    Inventory,
} = require('../models');

async function fetchCartIdByUserId(userId) {
    const cart = await Cart.findOne({
        where: { userId },
        attributes: ['id'],
    });

    return cart ? cart.id : null;
}

async function createCart(userId) {
    const cart = await Cart.create({ userId });
    return cart.id;
}

async function ensureCart(userId) {
    const existingId = await fetchCartIdByUserId(userId);
    if (existingId) {
        return existingId;
    }

    return createCart(userId);
}

async function fetchVariantBySku(sku) {
    const variant = await ProductVariant.findOne({
        where: { sku },
        attributes: ['id', 'sku', 'variantName', 'priceCents'],
        include: [
            {
                model: Product,
                as: 'product',
                attributes: ['name'],
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

    const plain = variant.get({ plain: true });
    return {
        id: plain.id,
        sku: plain.sku,
        variantName: plain.variantName,
        priceCents: plain.priceCents,
        productName: plain.product ? plain.product.name : null,
        stock: plain.inventory ? plain.inventory.stock : 0,
        reserved: plain.inventory ? plain.inventory.reserved : 0,
    };
}

async function fetchCartItemQuantity(cartId, variantId) {
    const item = await CartItem.findOne({
        where: { cartId, productVariantId: variantId },
        attributes: ['quantity'],
    });

    return item ? item.quantity : 0;
}

async function fetchCartItems(cartId) {
    const items = await CartItem.findAll({
        where: { cartId },
        attributes: ['quantity'],
        include: [
            {
                model: ProductVariant,
                as: 'variant',
                attributes: ['id', 'sku', 'variantName', 'priceCents'],
                include: [
                    {
                        model: Product,
                        as: 'product',
                        attributes: ['name'],
                    },
                ],
            },
        ],
        order: [['id', 'ASC']],
    });

    return items.map((item) => {
        const plain = item.get({ plain: true });
        const variant = plain.variant || {};
        const product = variant.product || {};
        return {
            productVariantId: variant.id,
            sku: variant.sku,
            variantName: variant.variantName,
            priceCents: variant.priceCents,
            productName: product.name,
            quantity: plain.quantity,
        };
    });
}

async function upsertCartItem(cartId, variantId, quantity) {
    const item = await CartItem.findOne({
        where: { cartId, productVariantId: variantId },
    });

    if (item) {
        item.quantity = item.quantity + quantity;
        await item.save();
        return;
    }

    await CartItem.create({
        cartId,
        productVariantId: variantId,
        quantity,
    });
}

async function updateCartItemQuantity(cartId, variantId, quantity) {
    const item = await CartItem.findOne({
        where: { cartId, productVariantId: variantId },
        attributes: ['id', 'quantity'],
    });

    if (!item) {
        return null;
    }

    item.quantity = quantity;
    await item.save();
    return item.get({ plain: true });
}

async function deleteCartItem(cartId, variantId) {
    const item = await CartItem.findOne({
        where: { cartId, productVariantId: variantId },
        attributes: ['id'],
    });

    if (!item) {
        return null;
    }

    await item.destroy();
    return item.get({ plain: true });
}

async function clearCartItems(cartId, transaction) {
    const options = { where: { cartId } };
    if (transaction) {
        options.transaction = transaction;
    }

    await CartItem.destroy(options);
}

module.exports = {
    fetchCartIdByUserId,
    ensureCart,
    fetchVariantBySku,
    fetchCartItems,
    fetchCartItemQuantity,
    upsertCartItem,
    updateCartItemQuantity,
    deleteCartItem,
    clearCartItems,
};
