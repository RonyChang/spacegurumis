function notFound(req, res, next) {
    res.status(404).json({
        data: null,
        message: 'Recurso no encontrado',
        errors: [{ message: 'Ruta no encontrada' }],
        meta: {},
    });
}

module.exports = notFound;
