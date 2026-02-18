const scopedCatalogImagesService = require('../services/scopedCatalogImages.service');

function parseId(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
        return null;
    }
    return parsed;
}

function badRequest(res, message, code) {
    const errorItem = { message: message || 'Solicitud invalida' };
    if (code) {
        errorItem.code = code;
    }

    return res.status(400).json({
        data: null,
        message: message || 'Solicitud invalida',
        errors: [errorItem],
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

function jsonOk(res, data, message = 'OK', status = 200) {
    return res.status(status).json({
        data,
        message,
        errors: [],
        meta: {
            total: Array.isArray(data) ? data.length : undefined,
        },
    });
}

function mapServiceError(result, res, next, fallbackMessage) {
    if (result.error === 'bad_request') {
        return badRequest(res, result.message || 'Solicitud invalida', result.code);
    }
    if (result.error === 'not_found') {
        return notFound(res, result.message || 'No encontrado');
    }
    if (result.error) {
        return next(new Error(result.message || fallbackMessage));
    }
    return null;
}

function buildProductContext(req) {
    return {
        categoryId: req.query && Object.prototype.hasOwnProperty.call(req.query, 'categoryId')
            ? req.query.categoryId
            : undefined,
    };
}

async function categoryPresign(req, res, next) {
    try {
        const categoryId = parseId(req.params.id);
        if (!categoryId) {
            return badRequest(res, 'categoryId invalido');
        }

        const result = await scopedCatalogImagesService.presignCategoryImage(categoryId, req.body || {});
        const handled = mapServiceError(result, res, next, 'No se pudo generar presign');
        if (handled) {
            return handled;
        }

        return jsonOk(res, result.data);
    } catch (error) {
        return next(error);
    }
}

async function categoryRegister(req, res, next) {
    try {
        const categoryId = parseId(req.params.id);
        if (!categoryId) {
            return badRequest(res, 'categoryId invalido');
        }

        const result = await scopedCatalogImagesService.registerCategoryImage(categoryId, req.body || {});
        const handled = mapServiceError(result, res, next, 'No se pudo registrar imagen de categoria');
        if (handled) {
            return handled;
        }

        return jsonOk(res, result.data, 'Creado', 201);
    } catch (error) {
        return next(error);
    }
}

async function categoryList(req, res, next) {
    try {
        const categoryId = parseId(req.params.id);
        if (!categoryId) {
            return badRequest(res, 'categoryId invalido');
        }

        const result = await scopedCatalogImagesService.listCategoryImages(categoryId);
        const handled = mapServiceError(result, res, next, 'No se pudo listar imagenes de categoria');
        if (handled) {
            return handled;
        }

        return jsonOk(res, result.data);
    } catch (error) {
        return next(error);
    }
}

async function categoryUpdate(req, res, next) {
    try {
        const categoryId = parseId(req.params.id);
        if (!categoryId) {
            return badRequest(res, 'categoryId invalido');
        }

        const imageId = parseId(req.params.imageId);
        if (!imageId) {
            return badRequest(res, 'imageId invalido');
        }

        const result = await scopedCatalogImagesService.updateCategoryImage(categoryId, imageId, req.body || {});
        const handled = mapServiceError(result, res, next, 'No se pudo actualizar imagen de categoria');
        if (handled) {
            return handled;
        }

        return jsonOk(res, result.data);
    } catch (error) {
        return next(error);
    }
}

async function categoryRemove(req, res, next) {
    try {
        const categoryId = parseId(req.params.id);
        if (!categoryId) {
            return badRequest(res, 'categoryId invalido');
        }

        const imageId = parseId(req.params.imageId);
        if (!imageId) {
            return badRequest(res, 'imageId invalido');
        }

        const result = await scopedCatalogImagesService.removeCategoryImage(categoryId, imageId);
        const handled = mapServiceError(result, res, next, 'No se pudo eliminar imagen de categoria');
        if (handled) {
            return handled;
        }

        return jsonOk(res, result.data);
    } catch (error) {
        return next(error);
    }
}

async function productPresign(req, res, next) {
    try {
        const productId = parseId(req.params.id);
        if (!productId) {
            return badRequest(res, 'productId invalido');
        }

        const result = await scopedCatalogImagesService.presignProductImage(productId, req.body || {}, buildProductContext(req));
        const handled = mapServiceError(result, res, next, 'No se pudo generar presign');
        if (handled) {
            return handled;
        }

        return jsonOk(res, result.data);
    } catch (error) {
        return next(error);
    }
}

async function productRegister(req, res, next) {
    try {
        const productId = parseId(req.params.id);
        if (!productId) {
            return badRequest(res, 'productId invalido');
        }

        const result = await scopedCatalogImagesService.registerProductImage(productId, req.body || {}, buildProductContext(req));
        const handled = mapServiceError(result, res, next, 'No se pudo registrar imagen de producto');
        if (handled) {
            return handled;
        }

        return jsonOk(res, result.data, 'Creado', 201);
    } catch (error) {
        return next(error);
    }
}

async function productList(req, res, next) {
    try {
        const productId = parseId(req.params.id);
        if (!productId) {
            return badRequest(res, 'productId invalido');
        }

        const result = await scopedCatalogImagesService.listProductImages(productId, buildProductContext(req));
        const handled = mapServiceError(result, res, next, 'No se pudo listar imagenes de producto');
        if (handled) {
            return handled;
        }

        return jsonOk(res, result.data);
    } catch (error) {
        return next(error);
    }
}

async function productUpdate(req, res, next) {
    try {
        const productId = parseId(req.params.id);
        if (!productId) {
            return badRequest(res, 'productId invalido');
        }

        const imageId = parseId(req.params.imageId);
        if (!imageId) {
            return badRequest(res, 'imageId invalido');
        }

        const result = await scopedCatalogImagesService.updateProductImage(productId, imageId, req.body || {}, buildProductContext(req));
        const handled = mapServiceError(result, res, next, 'No se pudo actualizar imagen de producto');
        if (handled) {
            return handled;
        }

        return jsonOk(res, result.data);
    } catch (error) {
        return next(error);
    }
}

async function productRemove(req, res, next) {
    try {
        const productId = parseId(req.params.id);
        if (!productId) {
            return badRequest(res, 'productId invalido');
        }

        const imageId = parseId(req.params.imageId);
        if (!imageId) {
            return badRequest(res, 'imageId invalido');
        }

        const result = await scopedCatalogImagesService.removeProductImage(productId, imageId, buildProductContext(req));
        const handled = mapServiceError(result, res, next, 'No se pudo eliminar imagen de producto');
        if (handled) {
            return handled;
        }

        return jsonOk(res, result.data);
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    categoryPresign,
    categoryRegister,
    categoryList,
    categoryUpdate,
    categoryRemove,
    productPresign,
    productRegister,
    productList,
    productUpdate,
    productRemove,
};
