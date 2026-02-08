const security = require('../config/security');
const authTokens = require('../services/authTokens.service');

function authRequired(req, res, next) {
    // Extrae y valida el JWT del header Authorization o cookie (modo transicional).
    const authHeader = req.headers.authorization || '';
    const hasBearer = authHeader.startsWith('Bearer ');

    try {
        if (hasBearer) {
            const token = authHeader.replace('Bearer ', '').trim();
            if (!token) {
                return res.status(401).json({
                    data: null,
                    message: 'No autorizado',
                    errors: [{ message: 'Token requerido' }],
                    meta: {},
                });
            }

            const user = authTokens.verifyAccessToken(token);
            req.user = user;
            req.authMethod = 'bearer';
            return next();
        }

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
        req.authMethod = 'cookie';
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
