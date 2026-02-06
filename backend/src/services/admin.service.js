const adminRepository = require('../repositories/admin.repository');
const orderRepository = require('../repositories/order.repository');
const orderStatusEmailService = require('./orderStatusEmail.service');

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

function mapOrderItems(items) {
    return items.map((item) => ({
        sku: item.sku,
        productName: item.productName,
        variantName: item.variantName,
        price: centsToSoles(item.priceCents),
        quantity: item.quantity,
    }));
}

function mapOrderRow(order) {
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
        user: order.user
            ? {
                id: order.user.id,
                email: order.user.email,
                firstName: order.user.firstName,
                lastName: order.user.lastName,
            }
            : null,
        items: Array.isArray(order.items) ? mapOrderItems(order.items) : [],
    };
}

async function listOrders(filters, pagination) {
    const [rows, total] = await Promise.all([
        adminRepository.fetchOrders(filters, pagination),
        adminRepository.fetchOrdersCount(filters),
    ]);

    const items = rows.map(mapOrderRow);
    const totalPages = total === 0 ? 0 : Math.ceil(total / pagination.pageSize);

    return {
        items,
        meta: {
            total,
            page: pagination.page,
            pageSize: pagination.pageSize,
            totalPages,
        },
    };
}

async function updateOrderStatus(orderId, orderStatus) {
    const existing = await orderRepository.findOrderById(orderId);
    if (!existing) {
        return { error: 'not_found' };
    }

    if ((orderStatus === 'shipped' || orderStatus === 'delivered')
        && existing.paymentStatus !== 'approved') {
        return { error: 'payment_required', paymentStatus: existing.paymentStatus };
    }

    const updated = await orderRepository.updateOrderStatusById(orderId, { orderStatus });

    if (orderStatus === 'shipped' || orderStatus === 'delivered') {
        try {
            await orderStatusEmailService.sendStatusEmail(orderId, orderStatus);
        } catch (error) {
            console.error('Error al enviar email de estado:', error.message || error);
        }
    }

    return {
        id: updated.id,
        orderStatus: updated.orderStatus,
        paymentStatus: updated.paymentStatus,
    };
}

async function updateVariantStock(sku, stock) {
    const variant = await adminRepository.findVariantBySku(sku);
    if (!variant) {
        return { error: 'not_found' };
    }

    const inventory = await adminRepository.findInventoryByVariantId(variant.id);
    const reserved = inventory ? Number(inventory.reserved || 0) : 0;
    if (stock < reserved) {
        return { error: 'reserved', reserved };
    }

    const updatedInventory = inventory
        ? await adminRepository.updateInventoryStock(inventory.id, stock)
        : await adminRepository.createInventory(variant.id, stock);

    return {
        sku: variant.sku,
        stock: updatedInventory ? updatedInventory.stock : stock,
        reserved,
    };
}

module.exports = {
    listOrders,
    updateOrderStatus,
    updateVariantStock,
};
