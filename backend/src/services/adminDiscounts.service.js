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

module.exports = {
    listDiscounts,
    createDiscount,
};
