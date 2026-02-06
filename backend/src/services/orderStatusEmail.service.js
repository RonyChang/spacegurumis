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

function buildStatusEmailText(order, status) {
    const user = order.user || {};
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    const greeting = fullName ? `Hola ${fullName},` : 'Hola,';

    const subtotal = centsToSoles(order.subtotalCents);
    const shipping = centsToSoles(order.shippingCostCents);
    const total = centsToSoles(order.totalCents);

    const statusLine = status === 'delivered'
        ? 'Tu pedido fue entregado.'
        : 'Tu pedido ya fue enviado.';

    const lines = [
        greeting,
        '',
        `Pedido #${order.id}.`,
        statusLine,
        '',
        'Productos:',
        buildItemsText(order.items),
        '',
        `Subtotal: ${formatPrice(subtotal)}`,
        `Envio: ${formatPrice(shipping)}`,
        `Total: ${formatPrice(total)}`,
        '',
        'Gracias por confiar en Spacegurumis.',
    ].filter(Boolean);

    return lines.join('\n');
}

async function sendStatusEmail(orderId, status) {
    const order = await orderRepository.findOrderForPaymentEmail(orderId);
    if (!order) {
        return { skipped: true, reason: 'order_not_found' };
    }

    if (!order.user || !order.user.email) {
        return { skipped: true, reason: 'email_missing' };
    }

    if (status === 'shipped' && order.shippedEmailSentAt) {
        return { skipped: true, reason: 'already_sent' };
    }

    if (status === 'delivered' && order.deliveredEmailSentAt) {
        return { skipped: true, reason: 'already_sent' };
    }

    const subject = status === 'delivered'
        ? `Gracias por tu compra #${order.id}`
        : `Tu pedido va en camino #${order.id}`;
    const text = buildStatusEmailText(order, status);

    await resendClient.sendEmail({
        to: order.user.email,
        subject,
        text,
    });

    const now = new Date();
    await orderRepository.updateOrderStatusEmails(
        order.id,
        status === 'delivered'
            ? { deliveredEmailSentAt: now }
            : { shippedEmailSentAt: now }
    );

    return { sent: true };
}

module.exports = {
    sendStatusEmail,
};
