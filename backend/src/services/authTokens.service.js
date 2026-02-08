const jwt = require('jsonwebtoken');

function createError(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
}

function getJwtSecret() {
    const secret = process.env.JWT_SECRET || '';
    if (!secret) {
        throw createError(500, 'JWT_SECRET no configurado');
    }

    return secret;
}

function normalizeUserForToken(user) {
    const id = user && user.id ? user.id : null;
    const email = user && user.email ? user.email : null;
    const role = user && user.role ? user.role : null;
    if (!id || !email || !role) {
        throw createError(500, 'Datos de usuario incompletos para token');
    }

    return { id, email, role };
}

function signToken(user, { expiresIn, tokenType } = {}) {
    const secret = getJwtSecret();
    const safeUser = normalizeUserForToken(user);
    const safeExpiresIn = expiresIn || process.env.JWT_EXPIRES_IN || '7d';

    const payload = {
        ...safeUser,
        tokenType: tokenType || 'access',
    };

    return jwt.sign(payload, secret, { expiresIn: safeExpiresIn });
}

function verifyToken(token) {
    const secret = getJwtSecret();
    return jwt.verify(token, secret);
}

function verifyAccessToken(token) {
    const payload = verifyToken(token);
    if (payload && payload.tokenType === 'refresh') {
        throw createError(401, 'Token inválido');
    }

    const id = payload && payload.id ? payload.id : null;
    const email = payload && payload.email ? payload.email : null;
    const role = payload && payload.role ? payload.role : null;
    if (!id || !email || !role) {
        throw createError(401, 'Token inválido');
    }

    return { id, email, role };
}

function verifyRefreshToken(token) {
    const payload = verifyToken(token);
    if (!payload || payload.tokenType !== 'refresh') {
        throw createError(401, 'Token inválido');
    }

    const id = payload && payload.id ? payload.id : null;
    const email = payload && payload.email ? payload.email : null;
    const role = payload && payload.role ? payload.role : null;
    if (!id || !email || !role) {
        throw createError(401, 'Token inválido');
    }

    return { id, email, role };
}

module.exports = {
    signToken,
    verifyAccessToken,
    verifyRefreshToken,
};

