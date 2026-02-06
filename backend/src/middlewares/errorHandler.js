function errorHandler(err, req, res, next) {
    const status = err && err.status ? err.status : 500;
    const message = err && err.message ? err.message : 'Error inesperado';

    res.status(status).json({
        data: null,
        message: 'Error interno del servidor',
        errors: [{ message }],
        meta: {},
    });
}

module.exports = errorHandler;
