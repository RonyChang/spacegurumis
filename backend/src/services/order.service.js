const { sequelize, Inventory } = require('../models');
const cartRepository = require('../repositories/cart.repository');
const orderRepository = require('../repositories/order.repository');
const profileRepository = require('../repositories/profile.repository');
const discountRepository = require('../repositories/discount.repository');
const discountService = require('../services/discount.service');

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

function parseSoles(value, fallback) {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
        return fallback;
    }

    return parsed;
}

function solesToCents(value) {
    return Math.round(Number(value) * 100);
}

function normalizeDistrict(value) {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

async function reserveStock(items, transaction) {
    for (const item of items) {
        const inventory = await Inventory.findOne({
            where: { productVariantId: item.productVariantId },
            transaction,
            lock: transaction.LOCK.UPDATE,
        });

        const stock = inventory ? Number(inventory.stock || 0) : 0;
        const reserved = inventory ? Number(inventory.reserved || 0) : 0;
        const available = Math.max(stock - reserved, 0);

        if (item.quantity > available) {
            const error = new Error('stock');
            error.code = 'stock';
            error.sku = item.sku;
            error.available = available;
            throw error;
        }

        if (inventory) {
            inventory.reserved = reserved + item.quantity;
            await inventory.save({ transaction });
        }
    }
}

async function releaseStock(items, transaction) {
    for (const item of items) {
        const inventory = await Inventory.findOne({
            where: { productVariantId: item.productVariantId },
            transaction,
            lock: transaction.LOCK.UPDATE,
        });

        if (!inventory) {
            continue;
        }

        const reserved = Number(inventory.reserved || 0);
        inventory.reserved = Math.max(reserved - item.quantity, 0);
        await inventory.save({ transaction });
    }
}

function resolveShippingCostCents(address) {
    const district = normalizeDistrict(address && address.district);
    if (!district) {
        return null;
    }

    const defaultSoles = parseSoles(process.env.DEFAULT_SHIPPING_COST, 10);
    const highSoles = parseSoles(process.env.HIGH_SHIPPING_COST, 15);
    const highDistricts = (process.env.HIGH_SHIPPING_DISTRICTS || '')
        .split(',')
        .map(normalizeDistrict)
        .filter(Boolean);
    const isHigh = highDistricts.includes(district);
    const costSoles = isHigh ? highSoles : defaultSoles;

    return Math.max(solesToCents(costSoles), 0);
}

function mapOrderItems(items) {
    return items.map((item) => ({
        sku: item.sku,
        productName: item.productName,
        variantName: item.variantName,
        price: centsToSoles(item.priceCents),
        quantity: item.quantity,
    }));
}

function mapOrderSummary(order) {
    return {
        id: order.id,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        subtotal: centsToSoles(order.subtotalCents),
        shippingCost: centsToSoles(order.shippingCostCents),
        discountCode: order.discountCode,
        discountPercentage: order.discountPercentage,
        discountAmount: centsToSoles(order.discountAmountCents),
        total: centsToSoles(order.totalCents),
        createdAt: order.createdAt,
    };
}

async function createOrder(userId, discountCode) {
    const address = await profileRepository.findAddressByUserId(userId);
    if (!address || !address.district) {
        return { error: 'address' };
    }

    const shippingCostCents = resolveShippingCostCents(address);
    if (shippingCostCents === null) {
        return { error: 'address' };
    }

    const cartId = await cartRepository.fetchCartIdByUserId(userId);
    if (!cartId) {
        return { error: 'empty' };
    }

    const items = await cartRepository.fetchCartItems(cartId);
    if (!items.length) {
        return { error: 'empty' };
    }

    const subtotalCents = items.reduce(
        (total, item) => total + (Number(item.priceCents) || 0) * item.quantity,
        0
    );
    const normalizedCode =
        typeof discountCode === 'string' && discountCode.trim()
            ? discountCode.trim().toUpperCase()
            : '';

    let order = null;
    let appliedDiscount = null;

    try {
        order = await sequelize.transaction(async (transaction) => {
            await reserveStock(items, transaction);

            if (normalizedCode) {
                const resolved = await discountService.resolveDiscountForOrder(
                    normalizedCode,
                    subtotalCents,
                    transaction
                );

                if (resolved.error) {
                    const error = new Error('discount');
                    error.code = 'discount';
                    error.message = resolved.error;
                    throw error;
                }

                appliedDiscount = resolved;
            }

            const discountedSubtotalCents = appliedDiscount
                ? appliedDiscount.finalSubtotalCents
                : subtotalCents;
            const totalCents = discountedSubtotalCents + shippingCostCents;

            const createdOrder = await orderRepository.createOrder(
                {
                    userId,
                    subtotalCents,
                    totalCents,
                    shippingCostCents,
                    discountCode: appliedDiscount ? appliedDiscount.code : null,
                    discountPercentage: appliedDiscount ? appliedDiscount.percentage : null,
                    discountAmountCents: appliedDiscount ? appliedDiscount.amountCents : null,
                    items,
                },
                transaction
            );

            if (appliedDiscount) {
                await discountRepository.createRedemption(
                    {
                        discountCodeId: appliedDiscount.discount.id,
                        orderId: createdOrder.id,
                        userId,
                    },
                    transaction
                );
                await discountRepository.incrementDiscountUsage(
                    appliedDiscount.discount.id,
                    transaction
                );
            }

            await cartRepository.clearCartItems(cartId, transaction);
            return createdOrder;
        });
    } catch (error) {
        if (error && error.code === 'stock') {
            return { error: 'stock', sku: error.sku, available: error.available };
        }

        if (error && error.code === 'discount') {
            return { error: 'discount', message: error.message };
        }

        throw error;
    }

    return {
        id: order.id,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        subtotal: centsToSoles(order.subtotalCents),
        shippingCost: centsToSoles(order.shippingCostCents),
        total: centsToSoles(order.totalCents),
        discountCode: order.discountCode,
        discountPercentage: order.discountPercentage,
        discountAmount: centsToSoles(order.discountAmountCents),
        items: mapOrderItems(items),
    };
}

async function listOrders(userId, pagination) {
    const [rows, total] = await Promise.all([
        orderRepository.fetchOrdersByUser(userId, pagination),
        orderRepository.fetchOrdersCountByUser(userId),
    ]);

    const items = rows.map(mapOrderSummary);
    const page = pagination && pagination.page ? pagination.page : 1;
    const pageSize = pagination && pagination.pageSize ? pagination.pageSize : 10;
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

    return {
        items,
        meta: {
            total,
            page,
            pageSize,
            totalPages,
        },
    };
}

async function getOrderDetail(userId, orderId) {
    const order = await orderRepository.findOrderWithItems(orderId, userId);
    if (!order) {
        return { error: 'not_found' };
    }

    return {
        id: order.id,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        subtotal: centsToSoles(order.subtotalCents),
        shippingCost: centsToSoles(order.shippingCostCents),
        discountCode: order.discountCode,
        discountPercentage: order.discountPercentage,
        discountAmount: centsToSoles(order.discountAmountCents),
        total: centsToSoles(order.totalCents),
        createdAt: order.createdAt,
        items: Array.isArray(order.items) ? mapOrderItems(order.items) : [],
    };
}

async function cancelOrder(userId, orderId) {
    const order = await orderRepository.findOrderWithItems(orderId, userId);
    if (!order) {
        return { error: 'not_found' };
    }

    if (order.orderStatus !== 'pendingPayment') {
        return { error: 'status' };
    }

    await sequelize.transaction(async (transaction) => {
        await releaseStock(order.items || [], transaction);
        await orderRepository.updateOrderStatus(
            orderId,
            userId,
            { orderStatus: 'cancelled', paymentStatus: 'rejected' },
            transaction
        );
    });

    return { id: order.id, orderStatus: 'cancelled' };
}

async function cancelOrderById(orderId) {
    const order = await orderRepository.findOrderWithItemsById(orderId);
    if (!order) {
        return { error: 'not_found' };
    }

    if (order.orderStatus !== 'pendingPayment') {
        return { error: 'status' };
    }

    await sequelize.transaction(async (transaction) => {
        await releaseStock(order.items || [], transaction);
        await orderRepository.updateOrderStatusById(
            orderId,
            { orderStatus: 'cancelled', paymentStatus: 'rejected' },
            transaction
        );
    });

    return { id: order.id, orderStatus: 'cancelled' };
}

async function cancelExpiredOrders(holdMinutes) {
    const minutes = Number(holdMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0) {
        return 0;
    }

    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    const expiredOrders = await orderRepository.findExpiredPendingOrders(cutoff);
    if (!expiredOrders.length) {
        return 0;
    }

    let cancelledCount = 0;
    for (const order of expiredOrders) {
        try {
            await sequelize.transaction(async (transaction) => {
                await releaseStock(order.items || [], transaction);
                await orderRepository.updateOrderStatusById(
                    order.id,
                    { orderStatus: 'cancelled', paymentStatus: 'rejected' },
                    transaction
                );
            });
            cancelledCount += 1;
        } catch (error) {
            // No detenemos el job si una orden falla.
            console.error('Error al cancelar orden expirada:', error.message || error);
        }
    }

    return cancelledCount;
}

module.exports = {
    createOrder,
    listOrders,
    getOrderDetail,
    cancelOrder,
    cancelOrderById,
    cancelExpiredOrders,
};
