const { Op } = require('sequelize');
const { Order, OrderItem, User, sequelize } = require('../models');

async function createOrder(
    {
        userId,
        subtotalCents,
        totalCents,
        shippingCostCents,
        discountCode,
        discountPercentage,
        discountAmountCents,
        items,
    },
    transaction
) {
    const order = await Order.create(
        {
            userId,
            orderStatus: 'pendingPayment',
            paymentStatus: 'pending',
            subtotalCents,
            totalCents,
            shippingCostCents,
            discountCode,
            discountPercentage,
            discountAmountCents,
        },
        { transaction }
    );

    const orderItems = items.map((item) => ({
        orderId: order.id,
        productVariantId: item.productVariantId,
        sku: item.sku,
        productName: item.productName,
        variantName: item.variantName,
        priceCents: item.priceCents,
        quantity: item.quantity,
    }));

    await OrderItem.bulkCreate(orderItems, { transaction });
    return order.get({ plain: true });
}

async function findOrderWithItems(orderId, userId) {
    const order = await Order.findOne({
        where: { id: orderId, userId },
        include: [
            {
                model: OrderItem,
                as: 'items',
                attributes: [
                    'id',
                    'productVariantId',
                    'sku',
                    'productName',
                    'variantName',
                    'priceCents',
                    'quantity',
                ],
            },
        ],
    });

    return order ? order.get({ plain: true }) : null;
}

async function findOrderWithItemsById(orderId) {
    const order = await Order.findOne({
        where: { id: orderId },
        include: [
            {
                model: OrderItem,
                as: 'items',
                attributes: [
                    'id',
                    'productVariantId',
                    'sku',
                    'productName',
                    'variantName',
                    'priceCents',
                    'quantity',
                ],
            },
        ],
    });

    return order ? order.get({ plain: true }) : null;
}

async function fetchOrdersByUser(userId, pagination) {
    const page = pagination && pagination.page ? pagination.page : 1;
    const pageSize = pagination && pagination.pageSize ? pagination.pageSize : 10;
    const offset = (page - 1) * pageSize;

    const orders = await Order.findAll({
        where: { userId },
        attributes: [
            'id',
            'orderStatus',
            'paymentStatus',
            'subtotalCents',
            'shippingCostCents',
            'discountCode',
            'discountPercentage',
            'discountAmountCents',
            'totalCents',
            [sequelize.col('created_at'), 'createdAt'],
        ],
        order: [[sequelize.col('created_at'), 'DESC']],
        limit: pageSize,
        offset,
    });

    return orders.map((order) => order.get({ plain: true }));
}

async function fetchOrdersCountByUser(userId) {
    return Order.count({ where: { userId } });
}

async function updateOrderStatus(orderId, userId, payload, transaction) {
    const order = await Order.findOne({
        where: { id: orderId, userId },
        transaction,
        lock: transaction ? transaction.LOCK.UPDATE : undefined,
    });

    if (!order) {
        return null;
    }

    if (payload.orderStatus) {
        order.orderStatus = payload.orderStatus;
    }

    if (payload.paymentStatus) {
        order.paymentStatus = payload.paymentStatus;
    }

    await order.save({ transaction });
    return order.get({ plain: true });
}

async function updateOrderStatusById(orderId, payload, transaction) {
    const order = await Order.findOne({
        where: { id: orderId },
        transaction,
        lock: transaction ? transaction.LOCK.UPDATE : undefined,
    });

    if (!order) {
        return null;
    }

    if (payload.orderStatus) {
        order.orderStatus = payload.orderStatus;
    }

    if (payload.paymentStatus) {
        order.paymentStatus = payload.paymentStatus;
    }

    await order.save({ transaction });
    return order.get({ plain: true });
}

async function findOrderById(orderId) {
    const order = await Order.findOne({
        where: { id: orderId },
    });

    return order ? order.get({ plain: true }) : null;
}

async function updateOrderStripeData(orderId, payload, transaction) {
    const order = await Order.findOne({
        where: { id: orderId },
        transaction,
        lock: transaction ? transaction.LOCK.UPDATE : undefined,
    });

    if (!order) {
        return null;
    }

    if (payload.stripeSessionId) {
        order.stripeSessionId = payload.stripeSessionId;
    }

    if (payload.stripePaymentIntentId) {
        order.stripePaymentIntentId = payload.stripePaymentIntentId;
    }

    if (payload.orderStatus) {
        order.orderStatus = payload.orderStatus;
    }

    if (payload.paymentStatus) {
        order.paymentStatus = payload.paymentStatus;
    }

    await order.save({ transaction });
    return order.get({ plain: true });
}

async function findExpiredPendingOrders(beforeDate) {
    const orders = await Order.findAll({
        where: {
            [Op.and]: [
                { orderStatus: 'pendingPayment' },
                sequelize.where(sequelize.literal('"Order"."created_at"'), Op.lt, beforeDate),
            ],
        },
        include: [
            {
                model: OrderItem,
                as: 'items',
                attributes: [
                    'id',
                    'productVariantId',
                    'sku',
                    'productName',
                    'variantName',
                    'priceCents',
                    'quantity',
                ],
            },
        ],
        order: [[sequelize.literal('"Order"."created_at"'), 'ASC']],
    });

    return orders.map((order) => order.get({ plain: true }));
}

async function findOrderForPaymentEmail(orderId) {
    const order = await Order.findOne({
        where: { id: orderId },
        include: [
            {
                model: User,
                as: 'user',
                attributes: ['id', 'email', 'firstName', 'lastName'],
                required: false,
            },
            {
                model: OrderItem,
                as: 'items',
                attributes: [
                    'id',
                    'productVariantId',
                    'sku',
                    'productName',
                    'variantName',
                    'priceCents',
                    'quantity',
                ],
                required: false,
            },
        ],
    });

    return order ? order.get({ plain: true }) : null;
}

async function updateOrderPaymentEmailSentAt(orderId, sentAt, transaction) {
    const order = await Order.findOne({
        where: { id: orderId },
        transaction,
        lock: transaction ? transaction.LOCK.UPDATE : undefined,
    });

    if (!order) {
        return null;
    }

    order.paymentEmailSentAt = sentAt;
    await order.save({ transaction });
    return order.get({ plain: true });
}

async function updateOrderStatusEmails(orderId, payload, transaction) {
    const order = await Order.findOne({
        where: { id: orderId },
        transaction,
        lock: transaction ? transaction.LOCK.UPDATE : undefined,
    });

    if (!order) {
        return null;
    }

    if (payload.shippedEmailSentAt) {
        order.shippedEmailSentAt = payload.shippedEmailSentAt;
    }

    if (payload.deliveredEmailSentAt) {
        order.deliveredEmailSentAt = payload.deliveredEmailSentAt;
    }

    await order.save({ transaction });
    return order.get({ plain: true });
}

module.exports = {
    createOrder,
    findOrderWithItems,
    findOrderWithItemsById,
    fetchOrdersByUser,
    fetchOrdersCountByUser,
    updateOrderStatus,
    updateOrderStatusById,
    findOrderById,
    updateOrderStripeData,
    findExpiredPendingOrders,
    findOrderForPaymentEmail,
    updateOrderPaymentEmailSentAt,
    updateOrderStatusEmails,
};
