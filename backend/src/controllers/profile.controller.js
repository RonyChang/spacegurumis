const profileService = require('../services/profile.service');

function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function normalizePhone(value) {
    return String(value).replace(/\s+/g, '').trim();
}

function isValidPhone(phone) {
    if (!isNonEmptyString(phone)) {
        return false;
    }

    const normalized = normalizePhone(phone);
    return /^(\+51)?\d{9}$/.test(normalized);
}

function isValidPostalCode(postalCode) {
    if (postalCode === null || postalCode === undefined || String(postalCode).trim() === '') {
        return true;
    }

    return /^\d{5}$/.test(String(postalCode).trim());
}

function validateUpdatePayload(payload) {
    const errors = [];

    if (payload.firstName !== undefined && !isNonEmptyString(payload.firstName)) {
        errors.push('Nombre inválido');
    }

    if (payload.lastName !== undefined && !isNonEmptyString(payload.lastName)) {
        errors.push('Apellido inválido');
    }

    if (payload.address !== undefined) {
        if (!payload.address || typeof payload.address !== 'object') {
            errors.push('Dirección inválida');
        } else {
            const address = payload.address;

            if (!isNonEmptyString(address.receiverName)) {
                errors.push('Nombre del receptor requerido');
            }

            if (!isValidPhone(address.phone)) {
                errors.push('Teléfono inválido');
            }

            if (!isNonEmptyString(address.addressLine1) || address.addressLine1.trim().length < 5) {
                errors.push('Dirección requiere mínimo 5 caracteres');
            }

            if (!isNonEmptyString(address.country)) {
                errors.push('País requerido');
            }

            if (!isNonEmptyString(address.city)) {
                errors.push('Ciudad requerida');
            }

            if (!isNonEmptyString(address.district)) {
                errors.push('Distrito requerido');
            }

            if (!isValidPostalCode(address.postalCode)) {
                errors.push('Código postal inválido');
            }
        }
    }

    return errors;
}

async function getProfile(req, res, next) {
    try {
        const userId = req.user && req.user.id ? req.user.id : null;
        if (!userId) {
            return res.status(401).json({
                data: null,
                message: 'No autorizado',
                errors: [{ message: 'Token requerido' }],
                meta: {},
            });
        }

        const result = await profileService.getProfile(userId);
        return res.status(200).json({
            data: result,
            message: 'OK',
            errors: [],
            meta: {},
        });
    } catch (error) {
        return next(error);
    }
}

async function updateProfile(req, res, next) {
    try {
        const userId = req.user && req.user.id ? req.user.id : null;
        if (!userId) {
            return res.status(401).json({
                data: null,
                message: 'No autorizado',
                errors: [{ message: 'Token requerido' }],
                meta: {},
            });
        }

        const payload = req.body || {};
        const errors = validateUpdatePayload(payload);
        if (errors.length) {
            return res.status(400).json({
                data: null,
                message: 'Datos inválidos',
                errors: errors.map((message) => ({ message })),
                meta: {},
            });
        }

        const result = await profileService.updateProfile(userId, payload);
        return res.status(200).json({
            data: result,
            message: 'OK',
            errors: [],
            meta: {},
        });
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    getProfile,
    updateProfile,
};
