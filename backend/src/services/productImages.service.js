const { Product, ProductVariant } = require('../models');
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

function parseOptionalPositiveInt(value) {
    if (value === undefined || value === null || value === '') {
        return { provided: false, value: null };
    }
    const parsed = parsePositiveInt(value);
    if (!parsed) {
        return { provided: true, value: null, error: true };
    }
    return { provided: true, value: parsed, error: false };
}

async function ensureVariantScope(variantId, context = {}) {
    const variant = await ProductVariant.findByPk(variantId, {
        attributes: ['id', 'productId'],
        include: [
            {
                model: Product,
                as: 'product',
                attributes: ['id', 'categoryId'],
                required: true,
            },
        ],
    });

    if (!variant) {
        return { error: 'not_found', message: 'Variante no encontrada' };
    }

    const plain = variant.get({ plain: true });
    const productId = parseOptionalPositiveInt(context.productId);
    if (productId.error) {
        return { error: 'bad_request', message: 'productId invalido' };
    }
    if (productId.provided && Number(plain.productId || 0) !== Number(productId.value)) {
        return { error: 'bad_request', message: 'La variante no pertenece al producto indicado' };
    }

    const categoryId = parseOptionalPositiveInt(context.categoryId);
    if (categoryId.error) {
        return { error: 'bad_request', message: 'categoryId invalido' };
    }
    if (categoryId.provided && Number((plain.product && plain.product.categoryId) || 0) !== Number(categoryId.value)) {
        return { error: 'bad_request', message: 'La variante no pertenece a la categoria indicada' };
    }

    return { data: plain };
}

async function presignProductImage(variantId, { contentType, byteSize }, context = {}) {
    const id = parsePositiveInt(variantId);
    if (!id) {
        return { error: 'bad_request', message: 'variantId invalido' };
    }

    const ensured = await ensureVariantScope(id, context);
    if (ensured.error) {
        return ensured;
    }

    try {
        const data = r2Service.presignVariantImageUpload({
            variantId: id,
            contentType,
            byteSize,
        });
        return { data };
    } catch (error) {
        return {
            error: 'bad_request',
            code: 'presign_contract_invalid',
            message: error && error.message ? error.message : 'Solicitud invalida',
        };
    }
}

function validateImageKeyForVariant(variantId, imageKey) {
    const key = String(imageKey || '').trim().replace(/^\/+/, '');
    if (!key) {
        return { ok: false, message: 'imageKey requerido' };
    }

    const expectedPrefix = `variants/${variantId}/`;
    if (!key.startsWith(expectedPrefix)) {
        return { ok: false, message: `imageKey debe empezar con ${expectedPrefix}` };
    }

    return { ok: true, key };
}

async function registerProductImage(variantId, payload, context = {}) {
    const id = parsePositiveInt(variantId);
    if (!id) {
        return { error: 'bad_request', message: 'variantId invalido' };
    }

    const ensured = await ensureVariantScope(id, context);
    if (ensured.error) {
        return ensured;
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

    const keyValidation = validateImageKeyForVariant(id, payload && payload.imageKey);
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
    if (head && head.error) {
        return {
            error: 'bad_request',
            code: 'register_head_failed',
            message: 'No se pudo verificar el archivo en R2 (HEAD fallo)',
        };
    }
    if (!head.exists) {
        return {
            error: 'bad_request',
            code: 'register_object_missing',
            message: 'El archivo no existe en R2 (o no es accesible publicamente)',
        };
    }

    // Best-effort metadata validation if available.
    if (head.contentType) {
        const headType = normalizeContentType(String(head.contentType).split(';')[0]);
        if (headType && headType !== contentType) {
            return {
                error: 'bad_request',
                code: 'register_content_type_mismatch',
                message: 'contentType no coincide con el archivo en R2',
            };
        }
    }
    if (typeof head.byteSize === 'number' && Number.isFinite(head.byteSize)) {
        if (Math.abs(head.byteSize - byteSize) > 0) {
            return {
                error: 'bad_request',
                code: 'register_byte_size_mismatch',
                message: 'byteSize no coincide con el archivo en R2',
            };
        }
    }

    const altText = payload && payload.altText !== undefined ? payload.altText : null;
    const sortOrder = payload && payload.sortOrder !== undefined ? parseNonNegativeInt(payload.sortOrder) : 0;
    if (payload && payload.sortOrder !== undefined && sortOrder === null) {
        return { error: 'bad_request', message: 'sortOrder invalido' };
    }

    try {
        const created = await productImagesRepository.createProductImage({
            productVariantId: id,
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

async function listProductImages(variantId, context = {}) {
    const id = parsePositiveInt(variantId);
    if (!id) {
        return { error: 'bad_request', message: 'variantId invalido' };
    }

    const ensured = await ensureVariantScope(id, context);
    if (ensured.error) {
        return ensured;
    }

    const items = await productImagesRepository.listProductImages(id);
    return { data: items };
}

async function updateProductImage(variantId, imageId, patch, context = {}) {
    const pid = parsePositiveInt(variantId);
    if (!pid) {
        return { error: 'bad_request', message: 'variantId invalido' };
    }

    const iid = parsePositiveInt(imageId);
    if (!iid) {
        return { error: 'bad_request', message: 'imageId invalido' };
    }

    const ensured = await ensureVariantScope(pid, context);
    if (ensured.error) {
        return ensured;
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

async function removeProductImage(variantId, imageId, context = {}) {
    const pid = parsePositiveInt(variantId);
    if (!pid) {
        return { error: 'bad_request', message: 'variantId invalido' };
    }

    const iid = parsePositiveInt(imageId);
    if (!iid) {
        return { error: 'bad_request', message: 'imageId invalido' };
    }

    const ensured = await ensureVariantScope(pid, context);
    if (ensured.error) {
        return ensured;
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
