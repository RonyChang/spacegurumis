const orderRepository = require('../repositories/order.repository');
const orderService = require('./order.service');
const paymentEmailService = require('./paymentEmail.service');

function parseOrderId(session) {
    if (!session) {
        return null;
    }

    const candidate = session.metadata && session.metadata.orderId
        ? session.metadata.orderId
        : session.client_reference_id;

    const parsed = Number(candidate);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
    }

    return Math.floor(parsed);
}

async function handleSessionCompleted(session) {
    const orderId = parseOrderId(session);
    if (!orderId) {
        return { ignored: true, reason: 'order_id_missing' };
    }

    const updated = await orderRepository.updateOrderStripeData(orderId, {
        paymentStatus: 'approved',
        orderStatus: 'paid',
        stripePaymentIntentId: session && session.payment_intent
            ? String(session.payment_intent)
            : null,
        stripeSessionId: session && session.id ? String(session.id) : null,
    });

    if (!updated) {
        return { ignored: true, reason: 'order_not_found' };
    }

    try {
        await paymentEmailService.sendPaymentApprovedEmail(orderId);
    } catch (error) {
        console.error('Error al enviar email de pago:', error.message || error);
    }

    return { handled: true, orderId };
}

async function handleSessionExpired(session) {
    const orderId = parseOrderId(session);
    if (!orderId) {
        return { ignored: true, reason: 'order_id_missing' };
    }

    const cancelled = await orderService.cancelOrderById(orderId);
    if (cancelled.error === 'not_found') {
        return { ignored: true, reason: 'order_not_found' };
    }

    if (cancelled.error === 'status') {
        return { ignored: true, reason: 'status_not_pending' };
    }

    return { handled: true, orderId };
}

async function handleStripeEvent(event) {
    if (!event || !event.type) {
        return { ignored: true, reason: 'event_invalid' };
    }

    switch (event.type) {
        case 'checkout.session.completed':
            return handleSessionCompleted(event.data && event.data.object);
        case 'checkout.session.expired':
            return handleSessionExpired(event.data && event.data.object);
        default:
            return { ignored: true, reason: 'event_unsupported' };
    }
}

module.exports = {
    handleStripeEvent,
};
