function adminRequired(req, res, next) {
    // Requiere un usuario autenticado con rol admin.
    const role = req.user && req.user.role ? req.user.role : '';
    if (role !== 'admin') {
        return res.status(403).json({
            data: null,
            message: 'Acceso denegado',
            errors: [{ message: 'Acceso denegado' }],
            meta: {},
        });
    }

    return next();
}

module.exports = adminRequired;
