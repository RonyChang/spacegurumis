const { sequelize } = require('../models');
const r2 = require('../config/r2');
const r2Service = require('./r2.service');
const scopedCatalogImagesRepository = require('../repositories/scopedCatalogImages.repository');

function parsePositiveInt(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
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

function parseNonNegativeInt(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
        return null;
    }
    return parsed;
}

function normalizeContentType(value) {
    return String(value || '').trim().toLowerCase();
}

function normalizeText(value) {
    if (value === undefined) {
        return { provided: false, value: null };
    }
    if (value === null) {
        return { provided: true, value: null };
    }

    const text = String(value).trim();
    return { provided: true, value: text || null };
}

function validateImageKeyPrefix(scope, entityId, imageKey) {
    const key = String(imageKey || '').trim().replace(/^\/+/, '');
    if (!key) {
        return { ok: false, message: 'imageKey requerido' };
    }

    const prefixMap = {
        category: 'categories',
        product: 'products',
    };

    const expectedPrefix = `${prefixMap[scope] || ''}/${entityId}/`;
    if (!expectedPrefix || !key.startsWith(expectedPrefix)) {
        return { ok: false, message: `imageKey debe empezar con ${expectedPrefix}` };
    }

    return { ok: true, key };
}

function mapScopedImage(row, scope) {
    const base = {
        id: row.id,
        scope,
        imageKey: row.imageKey,
        publicUrl: row.publicUrl,
        contentType: row.contentType,
        byteSize: Number(row.byteSize),
        altText: row.altText || null,
        sortOrder: Number(row.sortOrder || 0),
    };

    if (scope === 'category') {
        return {
            ...base,
            categoryId: Number(row.categoryId),
        };
    }

    return {
        ...base,
        productId: Number(row.productId),
    };
}

function validateHeadMetadata(head, contentType, byteSize) {
    if (head && head.error) {
        return { ok: false, code: 'register_head_failed', message: 'No se pudo verificar el archivo en R2 (HEAD fallo)' };
    }

    if (!head.exists) {
        return { ok: false, code: 'register_object_missing', message: 'El archivo no existe en R2 (o no es accesible publicamente)' };
    }

    if (head.contentType) {
        const headType = normalizeContentType(String(head.contentType).split(';')[0]);
        if (headType && headType !== contentType) {
            return { ok: false, code: 'register_content_type_mismatch', message: 'contentType no coincide con el archivo en R2' };
        }
    }

    if (typeof head.byteSize === 'number' && Number.isFinite(head.byteSize)) {
        if (Math.abs(head.byteSize - byteSize) > 0) {
            return { ok: false, code: 'register_byte_size_mismatch', message: 'byteSize no coincide con el archivo en R2' };
        }
    }

    return { ok: true };
}

async function ensureCategory(categoryId) {
    const category = await scopedCatalogImagesRepository.findCategoryById(categoryId);
    if (!category) {
        return null;
    }
    return category;
}

async function ensureProduct(productId, context = {}) {
    const product = await scopedCatalogImagesRepository.findProductById(productId);
    if (!product) {
        return { error: 'not_found', message: 'Producto no encontrado' };
    }

    const categoryId = parseOptionalPositiveInt(context.categoryId);
    if (categoryId.error) {
        return { error: 'bad_request', message: 'categoryId invalido' };
    }

    if (categoryId.provided && Number(product.categoryId || 0) !== Number(categoryId.value)) {
        return { error: 'bad_request', message: 'El producto no pertenece a la categoria indicada' };
    }

    return { data: product };
}

async function presignCategoryImage(categoryId, payload) {
    const cid = parsePositiveInt(categoryId);
    if (!cid) {
        return { error: 'bad_request', message: 'categoryId invalido' };
    }

    const category = await ensureCategory(cid);
    if (!category) {
        return { error: 'not_found', message: 'Categoria no encontrada' };
    }

    try {
        const data = r2Service.presignCatalogImageUpload({
            scope: 'category',
            entityId: cid,
            contentType: payload && payload.contentType,
            byteSize: payload && payload.byteSize,
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

async function registerCategoryImage(categoryId, payload) {
    const cid = parsePositiveInt(categoryId);
    if (!cid) {
        return { error: 'bad_request', message: 'categoryId invalido' };
    }

    const category = await ensureCategory(cid);
    if (!category) {
        return { error: 'not_found', message: 'Categoria no encontrada' };
    }

    if (!r2.publicBaseUrl) {
        return { error: 'bad_request', message: 'R2_PUBLIC_BASE_URL no configurado' };
    }

    const contentType = normalizeContentType(payload && payload.contentType);
    const byteSize = Number(payload && payload.byteSize);
    const validation = r2Service.validateImageUploadRequest({ contentType, byteSize });
    if (!validation.ok) {
        return { error: 'bad_request', message: validation.error || 'Solicitud invalida' };
    }

    const keyValidation = validateImageKeyPrefix('category', cid, payload && payload.imageKey);
    if (!keyValidation.ok) {
        return { error: 'bad_request', message: keyValidation.message };
    }

    const sortOrder = Object.prototype.hasOwnProperty.call(payload || {}, 'sortOrder')
        ? parseNonNegativeInt(payload.sortOrder)
        : 0;
    if (Object.prototype.hasOwnProperty.call(payload || {}, 'sortOrder') && sortOrder === null) {
        return { error: 'bad_request', message: 'sortOrder invalido' };
    }

    const altText = normalizeText(payload && payload.altText);

    const publicUrl = r2Service.buildPublicUrl(r2.publicBaseUrl, keyValidation.key);
    if (!publicUrl) {
        return { error: 'bad_request', message: 'No se pudo derivar publicUrl' };
    }

    const head = await r2Service.headPublicObject(publicUrl);
    const headValidation = validateHeadMetadata(head, contentType, byteSize);
    if (!headValidation.ok) {
        return { error: 'bad_request', code: headValidation.code, message: headValidation.message };
    }

    const created = await sequelize.transaction(async (transaction) => {
        await scopedCatalogImagesRepository.deleteCategoryImagesByCategory(cid, { transaction });
        return scopedCatalogImagesRepository.createCategoryImage({
            categoryId: cid,
            imageKey: keyValidation.key,
            publicUrl,
            contentType,
            byteSize,
            altText: altText.value,
            sortOrder: sortOrder === null ? 0 : sortOrder,
        }, { transaction });
    });

    return { data: mapScopedImage(created, 'category') };
}

async function listCategoryImages(categoryId) {
    const cid = parsePositiveInt(categoryId);
    if (!cid) {
        return { error: 'bad_request', message: 'categoryId invalido' };
    }

    const category = await ensureCategory(cid);
    if (!category) {
        return { error: 'not_found', message: 'Categoria no encontrada' };
    }

    const rows = await scopedCatalogImagesRepository.listCategoryImages(cid);
    return { data: rows.map((row) => mapScopedImage(row, 'category')) };
}

async function updateCategoryImage(categoryId, imageId, patch = {}) {
    const cid = parsePositiveInt(categoryId);
    if (!cid) {
        return { error: 'bad_request', message: 'categoryId invalido' };
    }

    const iid = parsePositiveInt(imageId);
    if (!iid) {
        return { error: 'bad_request', message: 'imageId invalido' };
    }

    const category = await ensureCategory(cid);
    if (!category) {
        return { error: 'not_found', message: 'Categoria no encontrada' };
    }

    const update = {};
    if (Object.prototype.hasOwnProperty.call(patch, 'altText')) {
        update.altText = normalizeText(patch.altText).value;
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'sortOrder')) {
        const sortOrder = parseNonNegativeInt(patch.sortOrder);
        if (sortOrder === null) {
            return { error: 'bad_request', message: 'sortOrder invalido' };
        }
        update.sortOrder = sortOrder;
    }

    const updated = await scopedCatalogImagesRepository.updateCategoryImage(cid, iid, update);
    if (!updated) {
        return { error: 'not_found', message: 'Imagen no encontrada' };
    }

    return { data: mapScopedImage(updated, 'category') };
}

async function removeCategoryImage(categoryId, imageId) {
    const cid = parsePositiveInt(categoryId);
    if (!cid) {
        return { error: 'bad_request', message: 'categoryId invalido' };
    }

    const iid = parsePositiveInt(imageId);
    if (!iid) {
        return { error: 'bad_request', message: 'imageId invalido' };
    }

    const category = await ensureCategory(cid);
    if (!category) {
        return { error: 'not_found', message: 'Categoria no encontrada' };
    }

    const deleted = await scopedCatalogImagesRepository.deleteCategoryImage(cid, iid);
    if (!deleted) {
        return { error: 'not_found', message: 'Imagen no encontrada' };
    }

    return { data: { deleted: true } };
}

async function presignProductImage(productId, payload, context = {}) {
    const pid = parsePositiveInt(productId);
    if (!pid) {
        return { error: 'bad_request', message: 'productId invalido' };
    }

    const ensured = await ensureProduct(pid, context);
    if (ensured.error) {
        return ensured;
    }

    try {
        const data = r2Service.presignCatalogImageUpload({
            scope: 'product',
            entityId: pid,
            contentType: payload && payload.contentType,
            byteSize: payload && payload.byteSize,
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

async function registerProductImage(productId, payload, context = {}) {
    const pid = parsePositiveInt(productId);
    if (!pid) {
        return { error: 'bad_request', message: 'productId invalido' };
    }

    const ensured = await ensureProduct(pid, context);
    if (ensured.error) {
        return ensured;
    }

    if (!r2.publicBaseUrl) {
        return { error: 'bad_request', message: 'R2_PUBLIC_BASE_URL no configurado' };
    }

    const contentType = normalizeContentType(payload && payload.contentType);
    const byteSize = Number(payload && payload.byteSize);
    const validation = r2Service.validateImageUploadRequest({ contentType, byteSize });
    if (!validation.ok) {
        return { error: 'bad_request', message: validation.error || 'Solicitud invalida' };
    }

    const keyValidation = validateImageKeyPrefix('product', pid, payload && payload.imageKey);
    if (!keyValidation.ok) {
        return { error: 'bad_request', message: keyValidation.message };
    }

    const sortOrder = Object.prototype.hasOwnProperty.call(payload || {}, 'sortOrder')
        ? parseNonNegativeInt(payload.sortOrder)
        : 0;
    if (Object.prototype.hasOwnProperty.call(payload || {}, 'sortOrder') && sortOrder === null) {
        return { error: 'bad_request', message: 'sortOrder invalido' };
    }

    const altText = normalizeText(payload && payload.altText);

    const publicUrl = r2Service.buildPublicUrl(r2.publicBaseUrl, keyValidation.key);
    if (!publicUrl) {
        return { error: 'bad_request', message: 'No se pudo derivar publicUrl' };
    }

    const head = await r2Service.headPublicObject(publicUrl);
    const headValidation = validateHeadMetadata(head, contentType, byteSize);
    if (!headValidation.ok) {
        return { error: 'bad_request', code: headValidation.code, message: headValidation.message };
    }

    const created = await sequelize.transaction(async (transaction) => {
        await scopedCatalogImagesRepository.deleteProductImagesByProduct(pid, { transaction });
        return scopedCatalogImagesRepository.createProductImage({
            productId: pid,
            imageKey: keyValidation.key,
            publicUrl,
            contentType,
            byteSize,
            altText: altText.value,
            sortOrder: sortOrder === null ? 0 : sortOrder,
        }, { transaction });
    });

    return { data: mapScopedImage(created, 'product') };
}

async function listProductImages(productId, context = {}) {
    const pid = parsePositiveInt(productId);
    if (!pid) {
        return { error: 'bad_request', message: 'productId invalido' };
    }

    const ensured = await ensureProduct(pid, context);
    if (ensured.error) {
        return ensured;
    }

    const rows = await scopedCatalogImagesRepository.listProductImages(pid);
    return { data: rows.map((row) => mapScopedImage(row, 'product')) };
}

async function updateProductImage(productId, imageId, patch = {}, context = {}) {
    const pid = parsePositiveInt(productId);
    if (!pid) {
        return { error: 'bad_request', message: 'productId invalido' };
    }

    const iid = parsePositiveInt(imageId);
    if (!iid) {
        return { error: 'bad_request', message: 'imageId invalido' };
    }

    const ensured = await ensureProduct(pid, context);
    if (ensured.error) {
        return ensured;
    }

    const update = {};
    if (Object.prototype.hasOwnProperty.call(patch, 'altText')) {
        update.altText = normalizeText(patch.altText).value;
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'sortOrder')) {
        const sortOrder = parseNonNegativeInt(patch.sortOrder);
        if (sortOrder === null) {
            return { error: 'bad_request', message: 'sortOrder invalido' };
        }
        update.sortOrder = sortOrder;
    }

    const updated = await scopedCatalogImagesRepository.updateProductImage(pid, iid, update);
    if (!updated) {
        return { error: 'not_found', message: 'Imagen no encontrada' };
    }

    return { data: mapScopedImage(updated, 'product') };
}

async function removeProductImage(productId, imageId, context = {}) {
    const pid = parsePositiveInt(productId);
    if (!pid) {
        return { error: 'bad_request', message: 'productId invalido' };
    }

    const iid = parsePositiveInt(imageId);
    if (!iid) {
        return { error: 'bad_request', message: 'imageId invalido' };
    }

    const ensured = await ensureProduct(pid, context);
    if (ensured.error) {
        return ensured;
    }

    const deleted = await scopedCatalogImagesRepository.deleteProductImage(pid, iid);
    if (!deleted) {
        return { error: 'not_found', message: 'Imagen no encontrada' };
    }

    return { data: { deleted: true } };
}

module.exports = {
    presignCategoryImage,
    registerCategoryImage,
    listCategoryImages,
    updateCategoryImage,
    removeCategoryImage,
    presignProductImage,
    registerProductImage,
    listProductImages,
    updateProductImage,
    removeProductImage,
};
