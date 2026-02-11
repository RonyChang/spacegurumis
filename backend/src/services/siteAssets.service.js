const r2 = require('../config/r2');
const siteAssetsConfig = require('../config/siteAssets');
const r2Service = require('./r2.service');
const siteAssetsRepository = require('../repositories/siteAssets.repository');

function normalizeSlot(value) {
    return String(value || '')
        .trim()
        .toLowerCase();
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

function parseOptionalString(value) {
    if (value === undefined) {
        return { provided: false, value: null };
    }
    if (value === null) {
        return { provided: true, value: null };
    }

    const normalized = String(value).trim();
    return { provided: true, value: normalized || null };
}

function parseOptionalBoolean(value) {
    if (value === undefined) {
        return { provided: false, value: null, error: null };
    }
    if (typeof value === 'boolean') {
        return { provided: true, value, error: null };
    }

    const normalized = String(value).trim().toLowerCase();
    if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) {
        return { provided: true, value: true, error: null };
    }
    if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) {
        return { provided: true, value: false, error: null };
    }

    return { provided: true, value: null, error: 'isActive invalido' };
}

function parseOptionalDate(value, fieldName) {
    if (value === undefined) {
        return { provided: false, value: null, error: null };
    }
    if (value === null || value === '') {
        return { provided: true, value: null, error: null };
    }

    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime())) {
        return { provided: true, value: null, error: `${fieldName} invalido` };
    }

    return { provided: true, value: date, error: null };
}

function validateWindow(startsAt, endsAt) {
    if (startsAt && endsAt && startsAt.getTime() > endsAt.getTime()) {
        return { ok: false, message: 'startsAt debe ser menor o igual a endsAt' };
    }
    return { ok: true };
}

function validateSlot(slot) {
    const normalized = normalizeSlot(slot);
    if (!normalized) {
        return { ok: false, message: 'slot requerido' };
    }

    const allowedSlots = new Set(siteAssetsConfig.allowedSlots.map((item) => normalizeSlot(item)));
    if (!allowedSlots.has(normalized)) {
        return { ok: false, message: 'slot no permitido' };
    }

    return { ok: true, slot: normalized };
}

function normalizeContentType(value) {
    return String(value || '').trim().toLowerCase();
}

function validateImageKeyForSlot(slot, imageKey) {
    const key = String(imageKey || '').trim().replace(/^\/+/, '');
    if (!key) {
        return { ok: false, message: 'imageKey requerido' };
    }

    const expectedPrefix = `site/${slot}/`;
    if (!key.startsWith(expectedPrefix)) {
        return { ok: false, message: `imageKey debe empezar con ${expectedPrefix}` };
    }

    return { ok: true, key };
}

async function presignSiteAsset(payload) {
    const slotValidation = validateSlot(payload && payload.slot);
    if (!slotValidation.ok) {
        return { error: 'bad_request', message: slotValidation.message };
    }

    const contentType = payload && typeof payload.contentType === 'string' ? payload.contentType : '';
    const byteSize = payload ? Number(payload.byteSize) : NaN;

    try {
        const data = r2Service.presignSiteAssetUpload({
            slot: slotValidation.slot,
            contentType,
            byteSize,
        });
        return {
            data: {
                slot: slotValidation.slot,
                ...data,
            },
        };
    } catch (error) {
        return {
            error: 'bad_request',
            message: error && error.message ? error.message : 'Solicitud invalida',
        };
    }
}

async function registerSiteAsset(payload) {
    const slotValidation = validateSlot(payload && payload.slot);
    if (!slotValidation.ok) {
        return { error: 'bad_request', message: slotValidation.message };
    }

    if (!r2.publicBaseUrl) {
        return { error: 'bad_request', message: 'R2_PUBLIC_BASE_URL no configurado' };
    }

    const contentType = normalizeContentType(payload && payload.contentType);
    const byteSize = payload ? Number(payload.byteSize) : NaN;
    const uploadValidation = r2Service.validateImageUploadRequest({ contentType, byteSize });
    if (!uploadValidation.ok) {
        return { error: 'bad_request', message: uploadValidation.error || 'Solicitud invalida' };
    }

    const keyValidation = validateImageKeyForSlot(slotValidation.slot, payload && payload.imageKey);
    if (!keyValidation.ok) {
        return { error: 'bad_request', message: keyValidation.message };
    }

    const startsAtResult = parseOptionalDate(payload && payload.startsAt, 'startsAt');
    if (startsAtResult.error) {
        return { error: 'bad_request', message: startsAtResult.error };
    }

    const endsAtResult = parseOptionalDate(payload && payload.endsAt, 'endsAt');
    if (endsAtResult.error) {
        return { error: 'bad_request', message: endsAtResult.error };
    }

    const windowValidation = validateWindow(startsAtResult.value, endsAtResult.value);
    if (!windowValidation.ok) {
        return { error: 'bad_request', message: windowValidation.message };
    }

    const sortOrder = payload && payload.sortOrder !== undefined ? parseNonNegativeInt(payload.sortOrder) : 0;
    if (payload && payload.sortOrder !== undefined && sortOrder === null) {
        return { error: 'bad_request', message: 'sortOrder invalido' };
    }

    const isActiveResult = parseOptionalBoolean(payload && payload.isActive);
    if (isActiveResult.error) {
        return { error: 'bad_request', message: isActiveResult.error };
    }

    const imageKey = keyValidation.key;
    const publicUrl = r2Service.buildPublicUrl(r2.publicBaseUrl, imageKey);
    if (!publicUrl) {
        return { error: 'bad_request', message: 'No se pudo derivar publicUrl' };
    }

    const head = await r2Service.headPublicObject(publicUrl);
    if (!head.exists) {
        return { error: 'bad_request', message: 'El archivo no existe en R2 (o no es accesible publicamente)' };
    }

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

    const titleResult = parseOptionalString(payload && payload.title);
    const altTextResult = parseOptionalString(payload && payload.altText);

    const created = await siteAssetsRepository.createSiteAsset({
        slot: slotValidation.slot,
        title: titleResult.value,
        altText: altTextResult.value,
        imageKey,
        publicUrl,
        contentType,
        byteSize,
        sortOrder: sortOrder === null ? 0 : sortOrder,
        isActive: isActiveResult.provided ? isActiveResult.value : true,
        startsAt: startsAtResult.value,
        endsAt: endsAtResult.value,
    });

    return { data: created };
}

async function listSiteAssets(filters = {}) {
    if (filters.slot !== undefined && filters.slot !== null && filters.slot !== '') {
        const slotValidation = validateSlot(filters.slot);
        if (!slotValidation.ok) {
            return { error: 'bad_request', message: slotValidation.message };
        }

        const data = await siteAssetsRepository.listSiteAssets({ slot: slotValidation.slot });
        return { data };
    }

    const data = await siteAssetsRepository.listSiteAssets({});
    return { data };
}

async function updateSiteAsset(id, patch = {}) {
    const parsedId = parsePositiveInt(id);
    if (!parsedId) {
        return { error: 'bad_request', message: 'siteAssetId invalido' };
    }

    const current = await siteAssetsRepository.findSiteAssetById(parsedId);
    if (!current) {
        return { error: 'not_found' };
    }

    const update = {};

    const titleResult = parseOptionalString(patch.title);
    if (titleResult.provided) {
        update.title = titleResult.value;
    }

    const altTextResult = parseOptionalString(patch.altText);
    if (altTextResult.provided) {
        update.altText = altTextResult.value;
    }

    if (Object.prototype.hasOwnProperty.call(patch, 'sortOrder')) {
        const sortOrder = parseNonNegativeInt(patch.sortOrder);
        if (sortOrder === null) {
            return { error: 'bad_request', message: 'sortOrder invalido' };
        }
        update.sortOrder = sortOrder;
    }

    const isActiveResult = parseOptionalBoolean(patch.isActive);
    if (isActiveResult.error) {
        return { error: 'bad_request', message: isActiveResult.error };
    }
    if (isActiveResult.provided) {
        update.isActive = isActiveResult.value;
    }

    const startsAtResult = parseOptionalDate(patch.startsAt, 'startsAt');
    if (startsAtResult.error) {
        return { error: 'bad_request', message: startsAtResult.error };
    }
    if (startsAtResult.provided) {
        update.startsAt = startsAtResult.value;
    }

    const endsAtResult = parseOptionalDate(patch.endsAt, 'endsAt');
    if (endsAtResult.error) {
        return { error: 'bad_request', message: endsAtResult.error };
    }
    if (endsAtResult.provided) {
        update.endsAt = endsAtResult.value;
    }

    const nextStartsAt = Object.prototype.hasOwnProperty.call(update, 'startsAt')
        ? update.startsAt
        : current.startsAt;
    const nextEndsAt = Object.prototype.hasOwnProperty.call(update, 'endsAt')
        ? update.endsAt
        : current.endsAt;

    const windowValidation = validateWindow(nextStartsAt, nextEndsAt);
    if (!windowValidation.ok) {
        return { error: 'bad_request', message: windowValidation.message };
    }

    const updated = await siteAssetsRepository.updateSiteAsset(parsedId, update);
    if (!updated) {
        return { error: 'not_found' };
    }

    return { data: updated };
}

async function removeSiteAsset(id) {
    const parsedId = parsePositiveInt(id);
    if (!parsedId) {
        return { error: 'bad_request', message: 'siteAssetId invalido' };
    }

    const deleted = await siteAssetsRepository.deleteSiteAsset(parsedId);
    if (!deleted) {
        return { error: 'not_found' };
    }

    return { data: { deleted: true } };
}

async function listPublicSiteAssets(slot) {
    const slotValidation = validateSlot(slot);
    if (!slotValidation.ok) {
        return { error: 'bad_request', message: slotValidation.message };
    }

    const rows = await siteAssetsRepository.listActiveSiteAssetsBySlot(slotValidation.slot, new Date());
    return {
        data: rows.map((row) => ({
            id: row.id,
            slot: row.slot,
            title: row.title || null,
            altText: row.altText || null,
            publicUrl: row.publicUrl,
            sortOrder: Number.isFinite(Number(row.sortOrder)) ? Number(row.sortOrder) : 0,
        })),
    };
}

module.exports = {
    presignSiteAsset,
    registerSiteAsset,
    listSiteAssets,
    updateSiteAsset,
    removeSiteAsset,
    listPublicSiteAssets,
};
