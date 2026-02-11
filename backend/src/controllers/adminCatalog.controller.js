const adminCatalogService = require('../services/adminCatalog.service');

function badRequest(res, message) {
    return res.status(400).json({
        data: null,
        message: message || 'Solicitud invalida',
        errors: [{ message: message || 'Solicitud invalida' }],
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

function conflict(res, message) {
    return res.status(409).json({
        data: null,
        message: message || 'Conflicto',
        errors: [{ message: message || 'Conflicto' }],
        meta: {},
    });
}

async function listCategories(req, res, next) {
    try {
        const result = await adminCatalogService.listCategories();
        return res.status(200).json({
            data: result.data,
            message: 'OK',
            errors: [],
            meta: { total: Array.isArray(result.data) ? result.data.length : 0 },
        });
    } catch (error) {
        return next(error);
    }
}

async function listProducts(req, res, next) {
    try {
        const result = await adminCatalogService.listProducts();
        return res.status(200).json({
            data: result.data,
            message: 'OK',
            errors: [],
            meta: { total: Array.isArray(result.data) ? result.data.length : 0 },
        });
    } catch (error) {
        return next(error);
    }
}

async function createProduct(req, res, next) {
    try {
        const payload = req.body && typeof req.body === 'object' ? req.body : {};
        const result = await adminCatalogService.createProduct(payload);

        if (result.error === 'bad_request') {
            return badRequest(res, result.message);
        }
        if (result.error === 'conflict') {
            return conflict(res, result.message);
        }
        if (result.error) {
            return next(new Error(result.message || 'No se pudo crear el producto'));
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

async function updateProduct(req, res, next) {
    try {
        const result = await adminCatalogService.updateProduct(req.params.id, req.body || {});
        if (result.error === 'bad_request') {
            return badRequest(res, result.message);
        }
        if (result.error === 'not_found') {
            return notFound(res, 'Producto no encontrado');
        }
        if (result.error === 'conflict') {
            return conflict(res, result.message);
        }
        if (result.error) {
            return next(new Error(result.message || 'No se pudo actualizar el producto'));
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

async function createVariant(req, res, next) {
    try {
        const result = await adminCatalogService.createVariant(req.params.id, req.body || {});
        if (result.error === 'bad_request') {
            return badRequest(res, result.message);
        }
        if (result.error === 'not_found') {
            return notFound(res, result.message || 'Producto no encontrado');
        }
        if (result.error === 'conflict') {
            return conflict(res, result.message);
        }
        if (result.error) {
            return next(new Error(result.message || 'No se pudo crear la variante'));
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

async function updateVariant(req, res, next) {
    try {
        const result = await adminCatalogService.updateVariant(req.params.id, req.body || {});
        if (result.error === 'bad_request') {
            return badRequest(res, result.message);
        }
        if (result.error === 'not_found') {
            return notFound(res, 'Variante no encontrada');
        }
        if (result.error === 'conflict') {
            return conflict(res, result.message);
        }
        if (result.error) {
            return next(new Error(result.message || 'No se pudo actualizar la variante'));
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

async function updateVariantStock(req, res, next) {
    try {
        const result = await adminCatalogService.updateVariantStock(req.params.id, req.body || {});
        if (result.error === 'bad_request') {
            return badRequest(res, result.message);
        }
        if (result.error === 'not_found') {
            return notFound(res, 'Variante no encontrada');
        }
        if (result.error === 'reserved') {
            return conflict(res, 'Stock menor que reservado');
        }
        if (result.error) {
            return next(new Error(result.message || 'No se pudo actualizar stock'));
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
    listCategories,
    listProducts,
    createProduct,
    updateProduct,
    createVariant,
    updateVariant,
    updateVariantStock,
};

