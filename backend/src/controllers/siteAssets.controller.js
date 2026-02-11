const siteAssetsService = require('../services/siteAssets.service');

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
        const payload = req.body && typeof req.body === 'object' ? req.body : {};
        const result = await siteAssetsService.presignSiteAsset(payload);

        if (result.error === 'bad_request') {
            return badRequest(res, result.message);
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
        const payload = req.body && typeof req.body === 'object' ? req.body : {};
        const result = await siteAssetsService.registerSiteAsset(payload);

        if (result.error === 'bad_request') {
            return badRequest(res, result.message);
        }
        if (result.error) {
            return next(new Error(result.message || 'No se pudo registrar el asset'));
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
        const slot = typeof req.query.slot === 'string' ? req.query.slot : '';
        const result = await siteAssetsService.listSiteAssets({ slot });

        if (result.error === 'bad_request') {
            return badRequest(res, result.message);
        }
        if (result.error) {
            return next(new Error(result.message || 'No se pudo listar site assets'));
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
        const siteAssetId = parseId(req.params.id);
        if (!siteAssetId) {
            return badRequest(res, 'siteAssetId invalido');
        }

        const payload = req.body && typeof req.body === 'object' ? req.body : {};
        const result = await siteAssetsService.updateSiteAsset(siteAssetId, payload);

        if (result.error === 'not_found') {
            return notFound(res, 'Asset no encontrado');
        }
        if (result.error === 'bad_request') {
            return badRequest(res, result.message);
        }
        if (result.error) {
            return next(new Error(result.message || 'No se pudo actualizar el asset'));
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
        const siteAssetId = parseId(req.params.id);
        if (!siteAssetId) {
            return badRequest(res, 'siteAssetId invalido');
        }

        const result = await siteAssetsService.removeSiteAsset(siteAssetId);

        if (result.error === 'not_found') {
            return notFound(res, 'Asset no encontrado');
        }
        if (result.error === 'bad_request') {
            return badRequest(res, result.message);
        }
        if (result.error) {
            return next(new Error(result.message || 'No se pudo eliminar el asset'));
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

async function listBySlot(req, res, next) {
    try {
        const slot = req.params && req.params.slot ? req.params.slot : '';
        const result = await siteAssetsService.listPublicSiteAssets(slot);

        if (result.error === 'bad_request') {
            return badRequest(res, result.message);
        }
        if (result.error) {
            return next(new Error(result.message || 'No se pudo listar assets del slot'));
        }

        return res.status(200).json({
            data: result.data,
            message: 'OK',
            errors: [],
            meta: { total: Array.isArray(result.data) ? result.data.length : 0, slot },
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
    listBySlot,
};
