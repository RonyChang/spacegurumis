const discountRepository = require('../repositories/discount.repository');

function normalizeCode(value) {
    return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

function parseBoolean(value, defaultValue = true) {
    if (value === undefined) {
        return defaultValue;
    }
    if (typeof value === 'boolean') {
        return value;
    }

    const normalized = String(value).trim().toLowerCase();
    return ['1', 'true', 'yes', 'y', 'on'].includes(normalized);
}

function parseOptionalBoolean(value) {
    if (value === undefined) {
        return { provided: false, value: null };
    }
    if (typeof value === 'boolean') {
        return { provided: true, value };
    }

    const normalized = String(value).trim().toLowerCase();
    if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) {
        return { provided: true, value: true };
    }
    if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) {
        return { provided: true, value: false };
    }
    return { provided: true, value: null, error: true };
}

function parseOptionalDate(value) {
    if (value === undefined || value === null || value === '') {
        return { provided: false, value: null, error: false };
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return { provided: true, value: null, error: true };
    }

    return { provided: true, value: parsed, error: false };
}

function parseOptionalPositiveInt(value) {
    if (value === undefined || value === null || value === '') {
        return { provided: false, value: null, error: false };
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
        return { provided: true, value: null, error: true };
    }

    return { provided: true, value: parsed, error: false };
}

function parseOptionalNonNegativeNumber(value) {
    if (value === undefined || value === null || value === '') {
        return { provided: false, value: null, error: false };
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
        return { provided: true, value: null, error: true };
    }

    return { provided: true, value: parsed, error: false };
}

function parsePositiveInt(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
        return null;
    }
    return parsed;
}

function centsToSoles(value) {
    if (value === null || value === undefined) {
        return null;
    }

    const cents = Number(value);
    if (!Number.isFinite(cents)) {
        return null;
    }

    return Number((cents / 100).toFixed(2));
}

function solesToCents(value) {
    return Math.round(Number(value) * 100);
}

function isUniqueConstraintError(error) {
    return Boolean(error && error.name === 'SequelizeUniqueConstraintError');
}

function normalizeDiscountRow(row) {
    return {
        id: row.id,
        code: row.code,
        percentage: Number(row.percentage),
        isActive: Boolean(row.isActive),
        startsAt: row.startsAt ? new Date(row.startsAt).toISOString() : null,
        expiresAt: row.expiresAt ? new Date(row.expiresAt).toISOString() : null,
        maxUses: row.maxUses === null || row.maxUses === undefined ? null : Number(row.maxUses),
        usedCount: Number(row.usedCount || 0),
        minSubtotal: centsToSoles(row.minSubtotalCents),
    };
}

async function listDiscounts() {
    const rows = await discountRepository.listDiscountCodes();
    return {
        data: rows.map(normalizeDiscountRow),
    };
}

async function createDiscount(payload) {
    const code = normalizeCode(payload && payload.code);
    const percentage = Number(payload && payload.percentage);
    const isActive = parseBoolean(payload && payload.isActive, true);

    const startsAt = parseOptionalDate(payload && payload.startsAt);
    const expiresAt = parseOptionalDate(payload && payload.expiresAt);
    const maxUses = parseOptionalPositiveInt(payload && payload.maxUses);
    const minSubtotal = parseOptionalNonNegativeNumber(payload && payload.minSubtotal);

    if (!code) {
        return { error: 'bad_request', message: 'code requerido' };
    }
    if (!Number.isFinite(percentage) || !Number.isInteger(percentage) || percentage <= 0 || percentage > 100) {
        return { error: 'bad_request', message: 'percentage invalido' };
    }
    if (startsAt.error) {
        return { error: 'bad_request', message: 'startsAt invalido' };
    }
    if (expiresAt.error) {
        return { error: 'bad_request', message: 'expiresAt invalido' };
    }
    if (maxUses.error) {
        return { error: 'bad_request', message: 'maxUses invalido' };
    }
    if (minSubtotal.error) {
        return { error: 'bad_request', message: 'minSubtotal invalido' };
    }
    if (startsAt.provided && expiresAt.provided && startsAt.value > expiresAt.value) {
        return { error: 'bad_request', message: 'Ventana de fechas invalida' };
    }

    try {
        const created = await discountRepository.createDiscountCode({
            code,
            percentage: Number(percentage),
            minSubtotalCents: minSubtotal.provided ? solesToCents(minSubtotal.value) : null,
            maxUses: maxUses.provided ? maxUses.value : null,
            usedCount: 0,
            isActive,
            startsAt: startsAt.provided ? startsAt.value : null,
            expiresAt: expiresAt.provided ? expiresAt.value : null,
        });

        return {
            data: normalizeDiscountRow(created),
        };
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            return { error: 'conflict', message: 'Codigo ya registrado' };
        }
        throw error;
    }
}

async function updateDiscount(discountId, payload) {
    const id = parsePositiveInt(discountId);
    if (!id) {
        return { error: 'bad_request', message: 'discountId invalido' };
    }

    const current = await discountRepository.findDiscountById(id);
    if (!current) {
        return { error: 'not_found', message: 'Descuento no encontrado' };
    }

    const update = {};

    if (Object.prototype.hasOwnProperty.call(payload || {}, 'code')) {
        const code = normalizeCode(payload && payload.code);
        if (!code) {
            return { error: 'bad_request', message: 'code invalido' };
        }
        update.code = code;
    }

    if (Object.prototype.hasOwnProperty.call(payload || {}, 'percentage')) {
        const percentage = Number(payload && payload.percentage);
        if (!Number.isFinite(percentage) || !Number.isInteger(percentage) || percentage <= 0 || percentage > 100) {
            return { error: 'bad_request', message: 'percentage invalido' };
        }
        update.percentage = percentage;
    }

    const isActive = parseOptionalBoolean(payload && payload.isActive);
    if (isActive.error) {
        return { error: 'bad_request', message: 'isActive invalido' };
    }
    if (isActive.provided) {
        update.isActive = isActive.value;
    }

    const startsAt = parseOptionalDate(payload && payload.startsAt);
    if (startsAt.error) {
        return { error: 'bad_request', message: 'startsAt invalido' };
    }
    if (startsAt.provided) {
        update.startsAt = startsAt.value;
    }

    const expiresAt = parseOptionalDate(payload && payload.expiresAt);
    if (expiresAt.error) {
        return { error: 'bad_request', message: 'expiresAt invalido' };
    }
    if (expiresAt.provided) {
        update.expiresAt = expiresAt.value;
    }

    const maxUses = parseOptionalPositiveInt(payload && payload.maxUses);
    if (maxUses.error) {
        return { error: 'bad_request', message: 'maxUses invalido' };
    }
    if (maxUses.provided) {
        update.maxUses = maxUses.value;
    }

    const minSubtotal = parseOptionalNonNegativeNumber(payload && payload.minSubtotal);
    if (minSubtotal.error) {
        return { error: 'bad_request', message: 'minSubtotal invalido' };
    }
    if (minSubtotal.provided) {
        update.minSubtotalCents = minSubtotal.value === null ? null : solesToCents(minSubtotal.value);
    }

    if (!Object.keys(update).length) {
        return { error: 'bad_request', message: 'Sin cambios para actualizar' };
    }

    const nextStartsAt = Object.prototype.hasOwnProperty.call(update, 'startsAt')
        ? update.startsAt
        : current.startsAt;
    const nextExpiresAt = Object.prototype.hasOwnProperty.call(update, 'expiresAt')
        ? update.expiresAt
        : current.expiresAt;
    if (nextStartsAt && nextExpiresAt && nextStartsAt > nextExpiresAt) {
        return { error: 'bad_request', message: 'Ventana de fechas invalida' };
    }

    try {
        const updated = await discountRepository.updateDiscountCode(id, update);
        if (!updated) {
            return { error: 'not_found', message: 'Descuento no encontrado' };
        }
        return { data: normalizeDiscountRow(updated) };
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            return { error: 'conflict', message: 'Codigo ya registrado' };
        }
        throw error;
    }
}

async function removeDiscount(discountId) {
    const id = parsePositiveInt(discountId);
    if (!id) {
        return { error: 'bad_request', message: 'discountId invalido' };
    }

    const exists = await discountRepository.findDiscountById(id);
    if (!exists) {
        return { error: 'not_found', message: 'Descuento no encontrado' };
    }

    const deleted = await discountRepository.deleteDiscountCode(id);
    if (!deleted) {
        return { error: 'not_found', message: 'Descuento no encontrado' };
    }

    return {
        data: {
            deleted: true,
            id,
        },
    };
}

module.exports = {
    listDiscounts,
    createDiscount,
    updateDiscount,
    removeDiscount,
};
