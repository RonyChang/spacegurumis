const security = require('../config/security');
const { normalizeOrigin } = require('../utils/origin');

const allowedOrigins = new Set(
    (security.csrf.allowedOrigins || [])
        .map(normalizeOrigin)
        .filter(Boolean)
);

function getRequestOrigin(req) {
    const origin = req && req.headers ? req.headers.origin : null;
    if (typeof origin === 'string' && origin.trim()) {
        return normalizeOrigin(origin);
    }

    const referer = req && req.headers ? req.headers.referer : null;
    if (typeof referer === 'string' && referer.trim()) {
        try {
            const url = new URL(referer);
            return normalizeOrigin(url.origin);
        } catch {
            return '';
        }
    }

    return '';
}

function isMutatingMethod(method) {
    const m = String(method || '').toUpperCase();
    return m === 'POST' || m === 'PUT' || m === 'PATCH' || m === 'DELETE';
}

function csrfRequired(req, res, next) {
    // Enforce CSRF only for authenticated mutating requests (cookie-only auth).
    if (!isMutatingMethod(req.method)) {
        return next();
    }

    // This middleware is expected to run after authRequired. If there's no user,
    // treat it as unauthenticated and don't enforce CSRF here.
    if (!req.user) {
        return next();
    }

    const origin = getRequestOrigin(req);
    if (!origin || !allowedOrigins.has(origin)) {
        return res.status(403).json({
            data: null,
            message: 'Acceso denegado',
            errors: [{ message: 'CSRF: origen inválido' }],
            meta: {},
        });
    }

    if (security.csrf.requireToken) {
        const cookies = req.cookies && typeof req.cookies === 'object' ? req.cookies : {};
        const csrfCookie = cookies[security.cookies.csrfCookieName] || '';
        const csrfHeader = req && req.headers ? req.headers['x-csrf-token'] : '';
        const token = typeof csrfHeader === 'string' ? csrfHeader.trim() : '';

        if (!csrfCookie || !token || csrfCookie !== token) {
            return res.status(403).json({
                data: null,
                message: 'Acceso denegado',
                errors: [{ message: 'CSRF: token requerido' }],
                meta: {},
            });
        }
    }

    return next();
}

module.exports = csrfRequired;
