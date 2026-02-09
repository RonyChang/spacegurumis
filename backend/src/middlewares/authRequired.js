const security = require('../config/security');
const authTokens = require('../services/authTokens.service');

function authRequired(req, res, next) {
    // Cookie-only auth (JWT in HttpOnly access cookie).
    try {
        const cookies = req.cookies && typeof req.cookies === 'object' ? req.cookies : {};
        const cookieToken = cookies[security.cookies.accessCookieName];
        if (!cookieToken) {
            return res.status(401).json({
                data: null,
                message: 'No autorizado',
                errors: [{ message: 'Token requerido' }],
                meta: {},
            });
        }

        const user = authTokens.verifyAccessToken(cookieToken);
        req.user = user;
        return next();
    } catch (error) {
        const status = error && error.status ? error.status : 401;
        const message = error && error.message ? error.message : 'Token inválido';
        return res.status(status).json({
            data: null,
            message: 'No autorizado',
            errors: [{ message }],
            meta: {},
        });
    }
}

module.exports = authRequired;
