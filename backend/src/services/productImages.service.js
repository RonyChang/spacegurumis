const { Product } = require('../models');
const r2 = require('../config/r2');
const r2Service = require('./r2.service');
const productImagesRepository = require('../repositories/productImages.repository');

function normalizeContentType(value) {
    return String(value || '').trim().toLowerCase();
}

function parsePositiveInt(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
        return null;
    }
    return parsed;
}

function parseNonNegativeInt(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
        return null;
    }
    return parsed;
}

async function ensureProductExists(productId) {
    const product = await Product.findByPk(productId, { attributes: ['id'] });
    return product ? product.get({ plain: true }) : null;
}

async function presignProductImage(productId, { contentType, byteSize }) {
    const id = parsePositiveInt(productId);
    if (!id) {
        return { error: 'bad_request', message: 'productId invalido' };
    }

    const product = await ensureProductExists(id);
    if (!product) {
        return { error: 'not_found' };
    }

    try {
        const data = r2Service.presignProductImageUpload({
            productId: id,
            contentType,
            byteSize,
        });
        return { data };
    } catch (error) {
        return {
            error: 'bad_request',
            message: error && error.message ? error.message : 'Solicitud invalida',
        };
    }
}

function validateImageKeyForProduct(productId, imageKey) {
    const key = String(imageKey || '').trim().replace(/^\/+/, '');
    if (!key) {
        return { ok: false, message: 'imageKey requerido' };
    }

    const expectedPrefix = `products/${productId}/`;
    if (!key.startsWith(expectedPrefix)) {
        return { ok: false, message: `imageKey debe empezar con ${expectedPrefix}` };
    }

    return { ok: true, key };
}

async function registerProductImage(productId, payload) {
    const id = parsePositiveInt(productId);
    if (!id) {
        return { error: 'bad_request', message: 'productId invalido' };
    }

    const product = await ensureProductExists(id);
    if (!product) {
        return { error: 'not_found' };
    }

    if (!r2.publicBaseUrl) {
        return { error: 'bad_request', message: 'R2_PUBLIC_BASE_URL no configurado' };
    }

    const contentType = normalizeContentType(payload && payload.contentType);
    const byteSize = payload ? Number(payload.byteSize) : NaN;
    const validation = r2Service.validateImageUploadRequest({ contentType, byteSize });
    if (!validation.ok) {
        return { error: 'bad_request', message: validation.error || 'Solicitud invalida' };
    }

    const keyValidation = validateImageKeyForProduct(id, payload && payload.imageKey);
    if (!keyValidation.ok) {
        return { error: 'bad_request', message: keyValidation.message };
    }

    const imageKey = keyValidation.key;
    const publicUrl = r2Service.buildPublicUrl(r2.publicBaseUrl, imageKey);
    if (!publicUrl) {
        return { error: 'bad_request', message: 'No se pudo derivar publicUrl' };
    }

    // Verify object exists (public HEAD). This avoids registering arbitrary keys.
    const head = await r2Service.headPublicObject(publicUrl);
    if (!head.exists) {
        return { error: 'bad_request', message: 'El archivo no existe en R2 (o no es accesible publicamente)' };
    }

    // Best-effort metadata validation if available.
    if (head.contentType) {
        const headType = normalizeContentType(String(head.contentType).split(';')[0]);
        if (headType && headType !== contentType) {
            return { error: 'bad_request', message: 'contentType no coincide con el archivo en R2' };
        }
    }
    if (typeof head.byteSize === 'number' && Number.isFinite(head.byteSize)) {
        if (Math.abs(head.byteSize - byteSize) > 0) {
            return { error: 'bad_request', message: 'byteSize no coincide con el archivo en R2' };
        }
    }

    const altText = payload && payload.altText !== undefined ? payload.altText : null;
    const sortOrder = payload && payload.sortOrder !== undefined ? parseNonNegativeInt(payload.sortOrder) : 0;
    if (payload && payload.sortOrder !== undefined && sortOrder === null) {
        return { error: 'bad_request', message: 'sortOrder invalido' };
    }

    try {
        const created = await productImagesRepository.createProductImage({
            productId: id,
            imageKey,
            publicUrl,
            contentType,
            byteSize,
            altText: altText === null ? null : String(altText || ''),
            sortOrder,
        });
        return { data: created };
    } catch (error) {
        return {
            error: 'internal',
            message: error && error.message ? error.message : 'No se pudo registrar la imagen',
        };
    }
}

async function listProductImages(productId) {
    const id = parsePositiveInt(productId);
    if (!id) {
        return { error: 'bad_request', message: 'productId invalido' };
    }

    const product = await ensureProductExists(id);
    if (!product) {
        return { error: 'not_found' };
    }

    const items = await productImagesRepository.listProductImages(id);
    return { data: items };
}

async function updateProductImage(productId, imageId, patch) {
    const pid = parsePositiveInt(productId);
    if (!pid) {
        return { error: 'bad_request', message: 'productId invalido' };
    }

    const iid = parsePositiveInt(imageId);
    if (!iid) {
        return { error: 'bad_request', message: 'imageId invalido' };
    }

    const product = await ensureProductExists(pid);
    if (!product) {
        return { error: 'not_found' };
    }

    const update = {};
    if (Object.prototype.hasOwnProperty.call(patch || {}, 'altText')) {
        update.altText = patch.altText === null ? null : String(patch.altText || '');
    }
    if (Object.prototype.hasOwnProperty.call(patch || {}, 'sortOrder')) {
        const sortOrder = parseNonNegativeInt(patch.sortOrder);
        if (sortOrder === null) {
            return { error: 'bad_request', message: 'sortOrder invalido' };
        }
        update.sortOrder = sortOrder;
    }

    const updated = await productImagesRepository.updateProductImage(pid, iid, update);
    if (!updated) {
        return { error: 'not_found' };
    }

    return { data: updated };
}

async function removeProductImage(productId, imageId) {
    const pid = parsePositiveInt(productId);
    if (!pid) {
        return { error: 'bad_request', message: 'productId invalido' };
    }

    const iid = parsePositiveInt(imageId);
    if (!iid) {
        return { error: 'bad_request', message: 'imageId invalido' };
    }

    const product = await ensureProductExists(pid);
    if (!product) {
        return { error: 'not_found' };
    }

    const deleted = await productImagesRepository.deleteProductImage(pid, iid);
    if (!deleted) {
        return { error: 'not_found' };
    }

    return { data: { deleted: true } };
}

module.exports = {
    presignProductImage,
    registerProductImage,
    listProductImages,
    updateProductImage,
    removeProductImage,
};

