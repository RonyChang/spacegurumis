const cartRepository = require('../repositories/cart.repository');

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

function mapCartItems(rows) {
    return rows.map((row) => ({
        sku: row.sku,
        productName: row.productName,
        variantName: row.variantName,
        price: centsToSoles(row.priceCents),
        quantity: row.quantity,
    }));
}

function buildSummary(items) {
    const totalItems = items.reduce((total, item) => total + item.quantity, 0);
    const subtotal = items.reduce((total, item) => {
        const price = Number(item.price) || 0;
        return total + price * item.quantity;
    }, 0);

    return {
        subtotal: Number(subtotal.toFixed(2)),
        totalItems,
    };
}

async function getCart(userId) {
    const cartId = await cartRepository.fetchCartIdByUserId(userId);
    if (!cartId) {
        return { items: [], summary: buildSummary([]) };
    }

    const rows = await cartRepository.fetchCartItems(cartId);
    const items = mapCartItems(rows);
    return { items, summary: buildSummary(items) };
}

async function addItem(userId, sku, quantity) {
    const variant = await cartRepository.fetchVariantBySku(sku);
    if (!variant) {
        return { error: 'sku' };
    }

    const cartId = await cartRepository.ensureCart(userId);
    const currentQuantity = await cartRepository.fetchCartItemQuantity(cartId, variant.id);
    const available = Math.max((variant.stock || 0) - (variant.reserved || 0), 0);

    if (currentQuantity + quantity > available) {
        return { error: 'stock', available };
    }

    await cartRepository.upsertCartItem(cartId, variant.id, quantity);

    const rows = await cartRepository.fetchCartItems(cartId);
    const items = mapCartItems(rows);
    return { items, summary: buildSummary(items) };
}

async function updateItem(userId, sku, quantity) {
    const variant = await cartRepository.fetchVariantBySku(sku);
    if (!variant) {
        return { error: 'sku' };
    }

    const cartId = await cartRepository.fetchCartIdByUserId(userId);
    if (!cartId) {
        return { error: 'item' };
    }

    const available = Math.max((variant.stock || 0) - (variant.reserved || 0), 0);
    if (quantity > available) {
        return { error: 'stock', available };
    }

    const updated = await cartRepository.updateCartItemQuantity(cartId, variant.id, quantity);
    if (!updated) {
        return { error: 'item' };
    }

    const rows = await cartRepository.fetchCartItems(cartId);
    const items = mapCartItems(rows);
    return { items, summary: buildSummary(items) };
}

async function removeItem(userId, sku) {
    const variant = await cartRepository.fetchVariantBySku(sku);
    if (!variant) {
        return { error: 'sku' };
    }

    const cartId = await cartRepository.fetchCartIdByUserId(userId);
    if (!cartId) {
        return { error: 'item' };
    }

    const removed = await cartRepository.deleteCartItem(cartId, variant.id);
    if (!removed) {
        return { error: 'item' };
    }

    const rows = await cartRepository.fetchCartItems(cartId);
    const items = mapCartItems(rows);
    return { items, summary: buildSummary(items) };
}

async function clearCart(userId) {
    const cartId = await cartRepository.fetchCartIdByUserId(userId);
    if (!cartId) {
        return { items: [], summary: buildSummary([]) };
    }

    await cartRepository.clearCartItems(cartId);
    return { items: [], summary: buildSummary([]) };
}

module.exports = {
    getCart,
    addItem,
    updateItem,
    removeItem,
    clearCart,
};
