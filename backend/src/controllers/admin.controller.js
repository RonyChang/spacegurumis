const adminService = require('../services/admin.service');

function getSingleValue(value) {
    return Array.isArray(value) ? value[0] : value;
}

function parseListParams(req) {
    const rawPage = getSingleValue(req.query.page);
    const rawPageSize = getSingleValue(req.query.pageSize);

    const parsedPage = rawPage ? Number(rawPage) : NaN;
    const parsedPageSize = rawPageSize ? Number(rawPageSize) : NaN;

    const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
    const pageSize = Number.isNaN(parsedPageSize) || parsedPageSize < 1 ? 20 : parsedPageSize;

    const rawOrderStatus = getSingleValue(req.query.orderStatus);
    const rawPaymentStatus = getSingleValue(req.query.paymentStatus);
    const rawEmail = getSingleValue(req.query.email);

    const orderStatus = typeof rawOrderStatus === 'string' ? rawOrderStatus.trim() : '';
    const paymentStatus = typeof rawPaymentStatus === 'string' ? rawPaymentStatus.trim() : '';
    const email = typeof rawEmail === 'string' ? rawEmail.trim() : '';

    return {
        page,
        pageSize,
        filters: {
            orderStatus: orderStatus || null,
            paymentStatus: paymentStatus || null,
            email: email || null,
        },
    };
}

async function listOrders(req, res, next) {
    try {
        const { filters, page, pageSize } = parseListParams(req);
        const { items, meta } = await adminService.listOrders(filters, {
            page,
            pageSize,
        });

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

async function updateOrderStatus(req, res, next) {
    try {
        const orderId = Number(req.params.id);
        if (!Number.isFinite(orderId)) {
            return res.status(400).json({
                data: null,
                message: 'Orden invalida',
                errors: [{ message: 'Orden invalida' }],
                meta: {},
            });
        }

        const orderStatus = req.body && typeof req.body.orderStatus === 'string'
            ? req.body.orderStatus.trim()
            : '';
        if (!orderStatus) {
            return res.status(400).json({
                data: null,
                message: 'orderStatus requerido',
                errors: [{ message: 'orderStatus requerido' }],
                meta: {},
            });
        }

        const result = await adminService.updateOrderStatus(orderId, orderStatus);
        if (result.error === 'not_found') {
            return res.status(404).json({
                data: null,
                message: 'Orden no encontrada',
                errors: [{ message: 'Orden no encontrada' }],
                meta: {},
            });
        }
        if (result.error === 'payment_required') {
            return res.status(409).json({
                data: null,
                message: 'No se puede actualizar sin pago confirmado',
                errors: [{ message: 'Pago no confirmado para esta orden' }],
                meta: { paymentStatus: result.paymentStatus || null },
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

async function updateVariantStock(req, res, next) {
    try {
        const sku = typeof req.params.sku === 'string' ? req.params.sku.trim() : '';
        if (!sku) {
            return res.status(400).json({
                data: null,
                message: 'SKU requerido',
                errors: [{ message: 'SKU requerido' }],
                meta: {},
            });
        }

        const stockValue = req.body ? Number(req.body.stock) : NaN;
        if (!Number.isFinite(stockValue) || !Number.isInteger(stockValue) || stockValue < 0) {
            return res.status(400).json({
                data: null,
                message: 'Stock invalido',
                errors: [{ message: 'Stock invalido' }],
                meta: {},
            });
        }

        const result = await adminService.updateVariantStock(sku, stockValue);
        if (result.error === 'not_found') {
            return res.status(404).json({
                data: null,
                message: 'Variante no encontrada',
                errors: [{ message: 'Variante no encontrada' }],
                meta: {},
            });
        }

        if (result.error === 'reserved') {
            return res.status(409).json({
                data: null,
                message: 'Stock menor que reservado',
                errors: [{ message: 'Stock menor que reservado' }],
                meta: { reserved: result.reserved },
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
    listOrders,
    updateOrderStatus,
    updateVariantStock,
};
