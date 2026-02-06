const { stripe, successUrl, cancelUrl } = require('../config/stripe');
const orderRepository = require('../repositories/order.repository');

function toCents(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function buildLineItems(order) {
    const subtotalCents = toCents(order.subtotalCents);
    const discountAmountCents = toCents(order.discountAmountCents);
    const shippingCostCents = toCents(order.shippingCostCents);
    const discountedSubtotalCents = Math.max(subtotalCents - discountAmountCents, 0);

    const lineItems = [];
    if (discountedSubtotalCents > 0) {
        lineItems.push({
            price_data: {
                currency: 'pen',
                product_data: {
                    name: discountAmountCents > 0
                        ? 'Subtotal con descuento'
                        : 'Subtotal de productos',
                },
                unit_amount: discountedSubtotalCents,
            },
            quantity: 1,
        });
    }

    if (shippingCostCents > 0) {
        lineItems.push({
            price_data: {
                currency: 'pen',
                product_data: {
                    name: 'Envio',
                },
                unit_amount: shippingCostCents,
            },
            quantity: 1,
        });
    }

    return lineItems;
}

async function createStripeSession(userId, orderId) {
    const order = await orderRepository.findOrderWithItems(orderId, userId);
    if (!order) {
        return { error: 'not_found' };
    }

    if (order.orderStatus !== 'pendingPayment') {
        return { error: 'status' };
    }

    if (!stripe) {
        return { error: 'config', message: 'STRIPE_SECRET_KEY no configurado' };
    }

    if (!successUrl || !cancelUrl) {
        return {
            error: 'config',
            message: 'STRIPE_SUCCESS_URL o STRIPE_CANCEL_URL no configurado',
        };
    }

    if (order.stripeSessionId) {
        try {
            const existing = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
            if (existing && existing.url) {
                return {
                    sessionId: existing.id,
                    checkoutUrl: existing.url,
                };
            }
        } catch (error) {
            return { error: 'session' };
        }

        return { error: 'session' };
    }

    const lineItems = buildLineItems(order);
    if (!lineItems.length) {
        return { error: 'total' };
    }

    const session = await stripe.checkout.sessions.create(
        {
            mode: 'payment',
            line_items: lineItems,
            success_url: successUrl,
            cancel_url: cancelUrl,
            client_reference_id: String(order.id),
            metadata: {
                orderId: String(order.id),
                discountCode: order.discountCode || '',
            },
        },
        { idempotencyKey: `order-${order.id}` }
    );

    await orderRepository.updateOrderStripeData(order.id, {
        stripeSessionId: session.id,
    });

    return {
        sessionId: session.id,
        checkoutUrl: session.url,
    };
}

module.exports = {
    createStripeSession,
};
