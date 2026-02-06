const paymentService = require('../services/payment.service');

function parseOrderId(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
    }

    return Math.floor(parsed);
}

async function createStripeSession(req, res, next) {
    try {
        const userId = req.user && req.user.id ? req.user.id : null;
        if (!userId) {
            return res.status(401).json({
                data: null,
                message: 'No autorizado',
                errors: [{ message: 'Token requerido' }],
                meta: {},
            });
        }

        const orderId = parseOrderId(req.body && req.body.orderId);
        if (!orderId) {
            return res.status(400).json({
                data: null,
                message: 'Datos invalidos',
                errors: [{ message: 'orderId requerido' }],
                meta: {},
            });
        }

        const result = await paymentService.createStripeSession(userId, orderId);
        if (result.error === 'not_found') {
            return res.status(404).json({
                data: null,
                message: 'Orden no encontrada',
                errors: [{ message: 'Orden no encontrada' }],
                meta: {},
            });
        }

        if (result.error === 'status') {
            return res.status(400).json({
                data: null,
                message: 'La orden no esta en pago pendiente',
                errors: [{ message: 'Estado invalido para pago' }],
                meta: {},
            });
        }

        if (result.error === 'total') {
            return res.status(400).json({
                data: null,
                message: 'Total invalido',
                errors: [{ message: 'No hay monto valido para cobrar' }],
                meta: {},
            });
        }

        if (result.error === 'session') {
            return res.status(409).json({
                data: null,
                message: 'Sesion de Stripe no disponible',
                errors: [{ message: 'La sesion de pago no esta disponible' }],
                meta: {},
            });
        }

        if (result.error === 'config') {
            return res.status(500).json({
                data: null,
                message: 'Error interno del servidor',
                errors: [{ message: result.message }],
                meta: {},
            });
        }

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
    createStripeSession,
};
