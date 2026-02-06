const cartService = require('../services/cart.service');

function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function parseQuantity(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return null;
    }

    return Number.isInteger(parsed) ? parsed : null;
}

async function getCart(req, res, next) {
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

        const result = await cartService.getCart(userId);
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

async function addCartItem(req, res, next) {
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

        const payload = req.body || {};
        const sku = isNonEmptyString(payload.sku) ? payload.sku.trim() : '';
        const quantity = parseQuantity(payload.quantity);

        if (!sku) {
            return res.status(400).json({
                data: null,
                message: 'Datos invalidos',
                errors: [{ message: 'SKU requerido' }],
                meta: {},
            });
        }

        if (!quantity || quantity <= 0) {
            return res.status(400).json({
                data: null,
                message: 'Datos invalidos',
                errors: [{ message: 'Cantidad invalida' }],
                meta: {},
            });
        }

        const result = await cartService.addItem(userId, sku, quantity);
        if (result.error === 'sku') {
            return res.status(404).json({
                data: null,
                message: 'SKU no encontrado',
                errors: [{ message: 'SKU no encontrado' }],
                meta: {},
            });
        }

        if (result.error === 'stock') {
            return res.status(409).json({
                data: null,
                message: 'Stock insuficiente',
                errors: [{ message: 'Stock insuficiente' }],
                meta: { available: result.available },
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

async function updateCartItem(req, res, next) {
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

        const sku = isNonEmptyString(req.params.sku) ? req.params.sku.trim() : '';
        const quantity = parseQuantity(req.body && req.body.quantity);

        if (!sku) {
            return res.status(400).json({
                data: null,
                message: 'Datos invalidos',
                errors: [{ message: 'SKU requerido' }],
                meta: {},
            });
        }

        if (!quantity || quantity <= 0) {
            return res.status(400).json({
                data: null,
                message: 'Datos invalidos',
                errors: [{ message: 'Cantidad invalida' }],
                meta: {},
            });
        }

        const result = await cartService.updateItem(userId, sku, quantity);
        if (result.error === 'sku') {
            return res.status(404).json({
                data: null,
                message: 'SKU no encontrado',
                errors: [{ message: 'SKU no encontrado' }],
                meta: {},
            });
        }

        if (result.error === 'item') {
            return res.status(404).json({
                data: null,
                message: 'Item no encontrado',
                errors: [{ message: 'Item no encontrado' }],
                meta: {},
            });
        }

        if (result.error === 'stock') {
            return res.status(409).json({
                data: null,
                message: 'Stock insuficiente',
                errors: [{ message: 'Stock insuficiente' }],
                meta: { available: result.available },
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

async function deleteCartItem(req, res, next) {
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

        const sku = isNonEmptyString(req.params.sku) ? req.params.sku.trim() : '';
        if (!sku) {
            return res.status(400).json({
                data: null,
                message: 'Datos invalidos',
                errors: [{ message: 'SKU requerido' }],
                meta: {},
            });
        }

        const result = await cartService.removeItem(userId, sku);
        if (result.error === 'sku') {
            return res.status(404).json({
                data: null,
                message: 'SKU no encontrado',
                errors: [{ message: 'SKU no encontrado' }],
                meta: {},
            });
        }

        if (result.error === 'item') {
            return res.status(404).json({
                data: null,
                message: 'Item no encontrado',
                errors: [{ message: 'Item no encontrado' }],
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

async function clearCart(req, res, next) {
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

        const result = await cartService.clearCart(userId);
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
    getCart,
    addCartItem,
    updateCartItem,
    deleteCartItem,
    clearCart,
};
