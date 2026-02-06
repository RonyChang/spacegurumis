const orderService = require('../services/order.service');

function getSingleValue(value) {
    return Array.isArray(value) ? value[0] : value;
}

function parsePagination(req) {
    const rawPage = getSingleValue(req.query.page);
    const rawPageSize = getSingleValue(req.query.pageSize);

    const parsedPage = rawPage ? Number(rawPage) : NaN;
    const parsedPageSize = rawPageSize ? Number(rawPageSize) : NaN;

    const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
    const pageSize = Number.isNaN(parsedPageSize) || parsedPageSize < 1 ? 10 : parsedPageSize;

    return { page, pageSize };
}

async function listOrders(req, res, next) {
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

        const pagination = parsePagination(req);
        const { items, meta } = await orderService.listOrders(userId, pagination);

        return res.status(200).json({
            data: items,
            message: 'OK',
            errors: [],
            meta,
        });
    } catch (error) {
        return next(error);
    }
}

async function getOrderDetail(req, res, next) {
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

        const orderId = Number(req.params.id);
        if (!Number.isFinite(orderId)) {
            return res.status(400).json({
                data: null,
                message: 'Orden inválida',
                errors: [{ message: 'Orden inválida' }],
                meta: {},
            });
        }

        const result = await orderService.getOrderDetail(userId, orderId);
        if (result.error === 'not_found') {
            return res.status(404).json({
                data: null,
                message: 'Orden no encontrada',
                errors: [{ message: 'Orden no encontrada' }],
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

async function createOrder(req, res, next) {
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

        const discountCode = req.body && typeof req.body.discountCode === 'string'
            ? req.body.discountCode
            : '';
        const result = await orderService.createOrder(userId, discountCode);
        if (result.error === 'address') {
            return res.status(400).json({
                data: null,
                message: 'Dirección requerida',
                errors: [{ message: 'Dirección requerida' }],
                meta: {},
            });
        }

        if (result.error === 'empty') {
            return res.status(400).json({
                data: null,
                message: 'Carrito vacío',
                errors: [{ message: 'Carrito vacío' }],
                meta: {},
            });
        }

        if (result.error === 'stock') {
            return res.status(409).json({
                data: null,
                message: 'Stock insuficiente',
                errors: [{ message: 'Stock insuficiente' }],
                meta: { sku: result.sku, available: result.available },
            });
        }

        if (result.error === 'discount') {
            return res.status(400).json({
                data: null,
                message: result.message || 'Código inválido',
                errors: [{ message: result.message || 'Código inválido' }],
                meta: {},
            });
        }

        return res.status(201).json({
            data: result,
            message: 'Orden creada',
            errors: [],
            meta: {},
        });
    } catch (error) {
        return next(error);
    }
}

async function cancelOrder(req, res, next) {
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

        const orderId = Number(req.params.id);
        if (!Number.isFinite(orderId)) {
            return res.status(400).json({
                data: null,
                message: 'Orden inválida',
                errors: [{ message: 'Orden inválida' }],
                meta: {},
            });
        }

        const result = await orderService.cancelOrder(userId, orderId);
        if (result.error === 'not_found') {
            return res.status(404).json({
                data: null,
                message: 'Orden no encontrada',
                errors: [{ message: 'Orden no encontrada' }],
                meta: {},
            });
        }

        if (result.error === 'status') {
            return res.status(409).json({
                data: null,
                message: 'Orden no cancelable',
                errors: [{ message: 'Orden no cancelable' }],
                meta: {},
            });
        }

        return res.status(200).json({
            data: result,
            message: 'Orden cancelada',
            errors: [],
            meta: {},
        });
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    listOrders,
    getOrderDetail,
    createOrder,
    cancelOrder,
};
