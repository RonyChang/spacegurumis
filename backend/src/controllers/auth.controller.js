const authService = require('../services/auth.service');

function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function isValidEmail(email) {
    if (!isNonEmptyString(email)) {
        return false;
    }

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidVerificationCode(code) {
    if (!isNonEmptyString(code)) {
        return false;
    }

    return /^\d{6}$/.test(code.trim());
}

function validateRegisterPayload(payload) {
    const errors = [];

    if (!isValidEmail(payload.email)) {
        errors.push('Email inválido');
    }

    if (payload.firstName && !isNonEmptyString(payload.firstName)) {
        errors.push('Nombre inválido');
    }

    if (payload.lastName && !isNonEmptyString(payload.lastName)) {
        errors.push('Apellido inválido');
    }

    if (!isNonEmptyString(payload.password) || payload.password.trim().length < 6) {
        errors.push('Contraseña mínima de 6 caracteres');
    }

    return errors;
}

function validateLoginPayload(payload) {
    const errors = [];

    if (!isValidEmail(payload.email)) {
        errors.push('Email inválido');
    }

    if (!isNonEmptyString(payload.password)) {
        errors.push('Contraseña requerida');
    }

    return errors;
}

function validateVerifyPayload(payload) {
    const errors = [];

    if (!isValidEmail(payload.email)) {
        errors.push('Email inválido');
    }

    if (!isValidVerificationCode(payload.code)) {
        errors.push('Código inválido');
    }

    return errors;
}

function validateResendPayload(payload) {
    const errors = [];

    if (!isValidEmail(payload.email)) {
        errors.push('Email inválido');
    }

    return errors;
}

async function register(req, res, next) {
    try {
        const { email, firstName, lastName, password } = req.body || {};
        const errors = validateRegisterPayload({ email, firstName, lastName, password });

        if (errors.length) {
            return res.status(400).json({
                data: null,
                message: 'Datos inválidos',
                errors: errors.map((message) => ({ message })),
                meta: {},
            });
        }

        const result = await authService.registerUser({ email, firstName, lastName, password });
        const status = result.resent ? 200 : 201;
        return res.status(status).json({
            data: result,
            message: 'OK',
            errors: [],
            meta: {},
        });
    } catch (error) {
        return next(error);
    }
}

async function login(req, res, next) {
    try {
        const { email, password } = req.body || {};
        const errors = validateLoginPayload({ email, password });

        if (errors.length) {
            return res.status(400).json({
                data: null,
                message: 'Datos inválidos',
                errors: errors.map((message) => ({ message })),
                meta: {},
            });
        }

        const result = await authService.loginUser({ email, password });
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

async function verifyEmail(req, res, next) {
    try {
        const { email, code } = req.body || {};
        const errors = validateVerifyPayload({ email, code });

        if (errors.length) {
            return res.status(400).json({
                data: null,
                message: 'Datos inválidos',
                errors: errors.map((message) => ({ message })),
                meta: {},
            });
        }

        const result = await authService.verifyEmail({ email, code });
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

async function verifyAdminTwoFactor(req, res, next) {
    try {
        const { email, code } = req.body || {};
        const errors = validateVerifyPayload({ email, code });

        if (errors.length) {
            return res.status(400).json({
                data: null,
                message: 'Datos inválidos',
                errors: errors.map((message) => ({ message })),
                meta: {},
            });
        }

        const result = await authService.verifyAdminTwoFactor({ email, code });
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

async function resendVerification(req, res, next) {
    try {
        const { email } = req.body || {};
        const errors = validateResendPayload({ email });

        if (errors.length) {
            return res.status(400).json({
                data: null,
                message: 'Datos inválidos',
                errors: errors.map((message) => ({ message })),
                meta: {},
            });
        }

        const result = await authService.resendVerification({ email });
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

async function googleStart(req, res, next) {
    try {
        const url = authService.buildGoogleAuthUrl();
        return res.redirect(url);
    } catch (error) {
        return next(error);
    }
}

async function googleCallback(req, res, next) {
    try {
        const frontendBaseUrl = process.env.FRONTEND_BASE_URL;
        const code = req.query.code;
        if (!code || typeof code !== 'string') {
            if (frontendBaseUrl) {
                const url = new URL('/login', frontendBaseUrl);
                url.hash = 'error=Codigo%20requerido';
                return res.redirect(url.toString());
            }

            return res.status(400).json({
                data: null,
                message: 'Datos inválidos',
                errors: [{ message: 'Código requerido' }],
                meta: {},
            });
        }

        const result = await authService.loginWithGoogle(code);
        if (frontendBaseUrl) {
            const url = new URL('/login', frontendBaseUrl);
            url.hash = `token=${encodeURIComponent(result.token)}`;
            return res.redirect(url.toString());
        }

        return res.status(200).json({
            data: result,
            message: 'OK',
            errors: [],
            meta: {},
        });
    } catch (error) {
        console.error('Google OAuth error:', error && error.message ? error.message : error);
        if (process.env.FRONTEND_BASE_URL) {
            const message = error && error.message
                ? error.message
                : 'No se pudo iniciar sesión con Google';
            const url = new URL('/login', process.env.FRONTEND_BASE_URL);
            url.hash = `error=${encodeURIComponent(message)}`;
            return res.redirect(url.toString());
        }

        return next(error);
    }
}

module.exports = {
    register,
    login,
    verifyEmail,
    verifyAdminTwoFactor,
    resendVerification,
    googleStart,
    googleCallback,
};
