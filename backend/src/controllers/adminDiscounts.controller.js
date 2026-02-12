const adminDiscountsService = require('../services/adminDiscounts.service');

function badRequest(res, message) {
    return res.status(400).json({
        data: null,
        message: message || 'Solicitud invalida',
        errors: [{ message: message || 'Solicitud invalida' }],
        meta: {},
    });
}

function conflict(res, message) {
    return res.status(409).json({
        data: null,
        message: message || 'Conflicto',
        errors: [{ message: message || 'Conflicto' }],
        meta: {},
    });
}

function notFound(res, message) {
    return res.status(404).json({
        data: null,
        message: message || 'No encontrado',
        errors: [{ message: message || 'No encontrado' }],
        meta: {},
    });
}

async function list(req, res, next) {
    try {
        const result = await adminDiscountsService.listDiscounts();
        return res.status(200).json({
            data: result.data,
            message: 'OK',
            errors: [],
            meta: {
                total: Array.isArray(result.data) ? result.data.length : 0,
            },
        });
    } catch (error) {
        return next(error);
    }
}

async function create(req, res, next) {
    try {
        const payload = req.body && typeof req.body === 'object' ? req.body : {};
        const result = await adminDiscountsService.createDiscount(payload);

        if (result.error === 'bad_request') {
            return badRequest(res, result.message);
        }
        if (result.error === 'conflict') {
            return conflict(res, result.message);
        }
        if (result.error) {
            return next(new Error(result.message || 'No se pudo crear el descuento'));
        }

        return res.status(201).json({
            data: result.data,
            message: 'Creado',
            errors: [],
            meta: {},
        });
    } catch (error) {
        return next(error);
    }
}

async function update(req, res, next) {
    try {
        const result = await adminDiscountsService.updateDiscount(req.params && req.params.id, req.body || {});

        if (result.error === 'bad_request') {
            return badRequest(res, result.message);
        }
        if (result.error === 'not_found') {
            return notFound(res, result.message);
        }
        if (result.error === 'conflict') {
            return conflict(res, result.message);
        }
        if (result.error) {
            return next(new Error(result.message || 'No se pudo actualizar el descuento'));
        }

        return res.status(200).json({
            data: result.data,
            message: 'OK',
            errors: [],
            meta: {},
        });
    } catch (error) {
        return next(error);
    }
}

async function remove(req, res, next) {
    try {
        const result = await adminDiscountsService.removeDiscount(req.params && req.params.id);

        if (result.error === 'bad_request') {
            return badRequest(res, result.message);
        }
        if (result.error === 'not_found') {
            return notFound(res, result.message);
        }
        if (result.error) {
            return next(new Error(result.message || 'No se pudo eliminar el descuento'));
        }

        return res.status(200).json({
            data: result.data,
            message: 'OK',
            errors: [],
            meta: {},
        });
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    list,
    create,
    update,
    remove,
};
