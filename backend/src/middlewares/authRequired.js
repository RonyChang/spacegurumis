const jwt = require('jsonwebtoken');

function authRequired(req, res, next) {
    // Extrae y valida el JWT del header Authorization.
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            data: null,
            message: 'No autorizado',
            errors: [{ message: 'Token requerido' }],
            meta: {},
        });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
        return res.status(401).json({
            data: null,
            message: 'No autorizado',
            errors: [{ message: 'Token requerido' }],
            meta: {},
        });
    }

    const secret = process.env.JWT_SECRET || '';
    if (!secret) {
        return res.status(500).json({
            data: null,
            message: 'Error interno del servidor',
            errors: [{ message: 'JWT_SECRET no configurado' }],
            meta: {},
        });
    }

    try {
        const payload = jwt.verify(token, secret);
        req.user = {
            id: payload.id,
            email: payload.email,
            role: payload.role,
        };
        return next();
    } catch (error) {
        return res.status(401).json({
            data: null,
            message: 'No autorizado',
            errors: [{ message: 'Token inválido' }],
            meta: {},
        });
    }
}

module.exports = authRequired;
