const productImagesService = require('../services/productImages.service');

function parseId(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
        return null;
    }
    return parsed;
}

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

async function presign(req, res, next) {
    try {
        const variantId = parseId(req.params.id);
        if (!variantId) {
            return badRequest(res, 'variantId invalido');
        }

        const contentType = req.body && typeof req.body.contentType === 'string'
            ? req.body.contentType
            : '';
        const byteSize = req.body ? Number(req.body.byteSize) : NaN;

        const result = await productImagesService.presignProductImage(variantId, {
            contentType,
            byteSize,
        });

        if (result.error === 'not_found') {
            return notFound(res, 'Variante no encontrada');
        }
        if (result.error === 'bad_request') {
            return badRequest(res, result.message || 'Solicitud invalida');
        }
        if (result.error) {
            return next(new Error(result.message || 'No se pudo generar presign'));
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

async function register(req, res, next) {
    try {
        const variantId = parseId(req.params.id);
        if (!variantId) {
            return badRequest(res, 'variantId invalido');
        }

        const payload = req.body && typeof req.body === 'object' ? req.body : {};
        const result = await productImagesService.registerProductImage(variantId, payload);

        if (result.error === 'not_found') {
            return notFound(res, 'Variante no encontrada');
        }
        if (result.error === 'bad_request') {
            return badRequest(res, result.message || 'Solicitud invalida');
        }
        if (result.error) {
            return next(new Error(result.message || 'No se pudo registrar la imagen'));
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

async function list(req, res, next) {
    try {
        const variantId = parseId(req.params.id);
        if (!variantId) {
            return badRequest(res, 'variantId invalido');
        }

        const result = await productImagesService.listProductImages(variantId);

        if (result.error === 'not_found') {
            return notFound(res, 'Variante no encontrada');
        }
        if (result.error === 'bad_request') {
            return badRequest(res, result.message || 'Solicitud invalida');
        }
        if (result.error) {
            return next(new Error(result.message || 'No se pudo listar imagenes'));
        }

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

async function update(req, res, next) {
    try {
        const variantId = parseId(req.params.id);
        if (!variantId) {
            return badRequest(res, 'variantId invalido');
        }

        const imageId = parseId(req.params.imageId);
        if (!imageId) {
            return badRequest(res, 'imageId invalido');
        }

        const payload = req.body && typeof req.body === 'object' ? req.body : {};
        const patch = {};
        if (Object.prototype.hasOwnProperty.call(payload, 'altText')) {
            patch.altText = payload.altText;
        }
        if (Object.prototype.hasOwnProperty.call(payload, 'sortOrder')) {
            patch.sortOrder = payload.sortOrder;
        }

        const result = await productImagesService.updateProductImage(variantId, imageId, patch);

        if (result.error === 'not_found') {
            return notFound(res, 'Imagen no encontrada');
        }
        if (result.error === 'bad_request') {
            return badRequest(res, result.message || 'Solicitud invalida');
        }
        if (result.error) {
            return next(new Error(result.message || 'No se pudo actualizar la imagen'));
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
        const variantId = parseId(req.params.id);
        if (!variantId) {
            return badRequest(res, 'variantId invalido');
        }

        const imageId = parseId(req.params.imageId);
        if (!imageId) {
            return badRequest(res, 'imageId invalido');
        }

        const result = await productImagesService.removeProductImage(variantId, imageId);

        if (result.error === 'not_found') {
            return notFound(res, 'Imagen no encontrada');
        }
        if (result.error === 'bad_request') {
            return badRequest(res, result.message || 'Solicitud invalida');
        }
        if (result.error) {
            return next(new Error(result.message || 'No se pudo eliminar la imagen'));
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
    presign,
    register,
    list,
    update,
    remove,
};
