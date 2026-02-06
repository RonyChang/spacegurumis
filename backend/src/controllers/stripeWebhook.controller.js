const { stripe } = require('../config/stripe');
const stripeWebhookService = require('../services/stripeWebhook.service');

async function handleStripeWebhook(req, res, next) {
    try {
        const signature = req.headers['stripe-signature'];
        const secret = process.env.STRIPE_WEBHOOK_SECRET || '';

        if (!secret) {
            return res.status(500).json({
                data: null,
                message: 'Error interno del servidor',
                errors: [{ message: 'STRIPE_WEBHOOK_SECRET no configurado' }],
                meta: {},
            });
        }

        if (!stripe) {
            return res.status(500).json({
                data: null,
                message: 'Error interno del servidor',
                errors: [{ message: 'STRIPE_SECRET_KEY no configurado' }],
                meta: {},
            });
        }

        if (!signature) {
            return res.status(400).json({
                data: null,
                message: 'Firma requerida',
                errors: [{ message: 'stripe-signature requerido' }],
                meta: {},
            });
        }

        let event;
        try {
            event = stripe.webhooks.constructEvent(req.body, signature, secret);
        } catch (error) {
            return res.status(400).json({
                data: null,
                message: 'Firma invalida',
                errors: [{ message: 'No se pudo validar el webhook' }],
                meta: {},
            });
        }

        const result = await stripeWebhookService.handleStripeEvent(event);
        return res.status(200).json({
            data: result,
            message: 'OK',
            errors: [],
            meta: {},
        });
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    handleStripeWebhook,
};
