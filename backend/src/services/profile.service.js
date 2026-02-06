const profileRepository = require('../repositories/profile.repository');

function createError(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
}

function normalizeOptional(value) {
    if (value === null || value === undefined) {
        return null;
    }
    const text = String(value).trim();
    return text === '' ? null : text;
}

function normalizeRequired(value) {
    return String(value).trim();
}

function normalizePhone(value) {
    return String(value).replace(/\s+/g, '').trim();
}

function normalizeAddress(address) {
    // Limpia campos para guardar valores consistentes en BD.
    return {
        receiverName: normalizeRequired(address.receiverName),
        phone: normalizePhone(address.phone),
        addressLine1: normalizeRequired(address.addressLine1),
        addressLine2: normalizeOptional(address.addressLine2),
        country: normalizeRequired(address.country),
        city: normalizeRequired(address.city),
        district: normalizeRequired(address.district),
        postalCode: normalizeOptional(address.postalCode),
        reference: normalizeOptional(address.reference),
    };
}

async function getProfile(userId) {
    const user = await profileRepository.findUserById(userId);
    if (!user) {
        throw createError(404, 'Usuario no encontrado');
    }

    const address = await profileRepository.findAddressByUserId(userId);
    return {
        user,
        address: address || null,
    };
}

async function updateProfile(userId, payload) {
    const firstName = normalizeOptional(payload.firstName);
    const lastName = normalizeOptional(payload.lastName);

    const user = await profileRepository.updateUserNames(userId, firstName, lastName);
    if (!user) {
        throw createError(404, 'Usuario no encontrado');
    }

    let address = null;
    if (payload.address) {
        const normalizedAddress = normalizeAddress(payload.address);
        address = await profileRepository.upsertAddress(userId, normalizedAddress);
    } else {
        address = await profileRepository.findAddressByUserId(userId);
    }

    return {
        user,
        address: address || null,
    };
}

module.exports = {
    getProfile,
    updateProfile,
};
