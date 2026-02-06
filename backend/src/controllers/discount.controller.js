const discountService = require('../services/discount.service');

function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function parseSubtotal(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return null;
    }

    return parsed;
}

async function validateDiscount(req, res, next) {
    try {
        const payload = req.body || {};
        const code = isNonEmptyString(payload.code) ? payload.code.trim() : '';
        const subtotal = parseSubtotal(payload.subtotal);

        if (!code) {
            return res.status(400).json({
                data: null,
                message: 'Código requerido',
                errors: [{ message: 'Código requerido' }],
                meta: {},
            });
        }

        if (subtotal === null || subtotal < 0) {
            return res.status(400).json({
                data: null,
                message: 'Subtotal inválido',
                errors: [{ message: 'Subtotal inválido' }],
                meta: {},
            });
        }

        const result = await discountService.validateDiscountForSubtotal(code, subtotal);
        if (result.error) {
            return res.status(400).json({
                data: null,
                message: result.error,
                errors: [{ message: result.error }],
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
    validateDiscount,
};
