const orderRepository = require('../repositories/order.repository');
const resendClient = require('./resendClient.service');

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

function formatPrice(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return 'S/ -';
    }

    return `S/ ${numeric.toFixed(2)}`;
}

function buildItemsText(items) {
    if (!Array.isArray(items) || !items.length) {
        return '- Sin items';
    }

    return items
        .map((item) => {
            const name = item.productName || 'Producto';
            const variant = item.variantName ? ` - ${item.variantName}` : '';
            const price = centsToSoles(item.priceCents);
            const quantity = Number(item.quantity) || 0;
            return `- ${name}${variant} x${quantity} (${formatPrice(price)})`;
        })
        .join('\n');
}

function buildPaymentEmailText(order) {
    const user = order.user || {};
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    const greeting = fullName ? `Hola ${fullName},` : 'Hola,';

    const subtotal = centsToSoles(order.subtotalCents);
    const shipping = centsToSoles(order.shippingCostCents);
    const total = centsToSoles(order.totalCents);
    const discount = centsToSoles(order.discountAmountCents);

    const lines = [
        greeting,
        '',
        `Gracias por tu compra #${order.id}.`,
        '',
        'Productos:',
        buildItemsText(order.items),
        '',
        `Subtotal: ${formatPrice(subtotal)}`,
        discount ? `Descuento: -${formatPrice(discount)}` : null,
        `Envio: ${formatPrice(shipping)}`,
        `Total: ${formatPrice(total)}`,
        '',
        'Te contactaremos por WhatsApp para coordinar la entrega.',
    ].filter(Boolean);

    return lines.join('\n');
}

async function sendPaymentApprovedEmail(orderId) {
    const order = await orderRepository.findOrderForPaymentEmail(orderId);
    if (!order) {
        return { skipped: true, reason: 'order_not_found' };
    }

    if (order.paymentEmailSentAt) {
        return { skipped: true, reason: 'already_sent' };
    }

    if (!order.user || !order.user.email) {
        return { skipped: true, reason: 'email_missing' };
    }

    const subject = `Confirmacion de compra #${order.id}`;
    const text = buildPaymentEmailText(order);

    await resendClient.sendEmail({
        to: order.user.email,
        subject,
        text,
    });

    await orderRepository.updateOrderPaymentEmailSentAt(order.id, new Date());
    return { sent: true };
}

module.exports = {
    sendPaymentApprovedEmail,
};
