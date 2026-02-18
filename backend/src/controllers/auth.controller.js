const authService = require('../services/auth.service');
const security = require('../config/security');
const authTokens = require('../services/authTokens.service');
const authCookies = require('../services/authCookies.service');

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

function validateForgotPasswordPayload(payload) {
    const errors = [];

    if (!isValidEmail(payload.email)) {
        errors.push('Email inválido');
    }

    return errors;
}

function validateResetPasswordPayload(payload) {
    const errors = [];

    if (!isNonEmptyString(payload.token) || payload.token.trim().length < 32) {
        errors.push('Token inválido');
    }

    if (!isNonEmptyString(payload.newPassword) || payload.newPassword.trim().length < 6) {
        errors.push('Contraseña mínima de 6 caracteres');
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
        if (result && result.user) {
            const accessToken = authTokens.signToken(result.user, {
                expiresIn: security.cookies.accessExpiresIn,
                tokenType: 'access',
            });
            const refreshToken = security.cookies.refreshEnabled
                ? authTokens.signToken(result.user, {
                    expiresIn: security.cookies.refreshExpiresIn,
                    tokenType: 'refresh',
                })
                : null;
            authCookies.setAuthCookies(res, { accessToken, refreshToken });
        }
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
        if (result && result.user) {
            const accessToken = authTokens.signToken(result.user, {
                expiresIn: security.cookies.accessExpiresIn,
                tokenType: 'access',
            });
            const refreshToken = security.cookies.refreshEnabled
                ? authTokens.signToken(result.user, {
                    expiresIn: security.cookies.refreshExpiresIn,
                    tokenType: 'refresh',
                })
                : null;
            authCookies.setAuthCookies(res, { accessToken, refreshToken });
        }
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
        if (result && result.user) {
            const accessToken = authTokens.signToken(result.user, {
                expiresIn: security.cookies.accessExpiresIn,
                tokenType: 'access',
            });
            const refreshToken = security.cookies.refreshEnabled
                ? authTokens.signToken(result.user, {
                    expiresIn: security.cookies.refreshExpiresIn,
                    tokenType: 'refresh',
                })
                : null;
            authCookies.setAuthCookies(res, { accessToken, refreshToken });
        }
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

async function forgotPassword(req, res, next) {
    try {
        const { email } = req.body || {};
        const errors = validateForgotPasswordPayload({ email });
        if (errors.length) {
            return res.status(400).json({
                data: null,
                message: 'Datos inválidos',
                errors: errors.map((message) => ({ message })),
                meta: {},
            });
        }

        await authService.requestPasswordReset({ email });
        return res.status(200).json({
            data: {
                accepted: true,
            },
            message: 'Si el correo es elegible, enviaremos instrucciones de recuperación.',
            errors: [],
            meta: {},
        });
    } catch (error) {
        return next(error);
    }
}

async function resetPassword(req, res, next) {
    try {
        const { token, newPassword } = req.body || {};
        const errors = validateResetPasswordPayload({ token, newPassword });
        if (errors.length) {
            return res.status(400).json({
                data: null,
                message: 'Datos inválidos',
                errors: errors.map((message) => ({ message })),
                meta: {},
            });
        }

        const result = await authService.resetPassword({
            token: token.trim(),
            newPassword,
        });
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
        if (result && result.user) {
            const accessToken = authTokens.signToken(result.user, {
                expiresIn: security.cookies.accessExpiresIn,
                tokenType: 'access',
            });
            const refreshToken = security.cookies.refreshEnabled
                ? authTokens.signToken(result.user, {
                    expiresIn: security.cookies.refreshExpiresIn,
                    tokenType: 'refresh',
                })
                : null;
            authCookies.setAuthCookies(res, { accessToken, refreshToken });
        }
        if (frontendBaseUrl) {
            const url = new URL('/login', frontendBaseUrl);
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

async function logout(req, res, next) {
    try {
        authCookies.clearAuthCookies(res);
        return res.status(200).json({
            data: { ok: true },
            message: 'OK',
            errors: [],
            meta: {},
        });
    } catch (error) {
        return next(error);
    }
}

async function refresh(req, res, next) {
    try {
        if (!security.cookies.refreshEnabled) {
            return res.status(404).json({
                data: null,
                message: 'Recurso no encontrado',
                errors: [{ message: 'Ruta no encontrada' }],
                meta: {},
            });
        }

        const cookies = req.cookies && typeof req.cookies === 'object' ? req.cookies : {};
        const refreshToken = cookies[security.cookies.refreshCookieName];
        if (!refreshToken) {
            return res.status(401).json({
                data: null,
                message: 'No autorizado',
                errors: [{ message: 'Token requerido' }],
                meta: {},
            });
        }

        const user = authTokens.verifyRefreshToken(refreshToken);
        const newAccessToken = authTokens.signToken(user, {
            expiresIn: security.cookies.accessExpiresIn,
            tokenType: 'access',
        });
        const newRefreshToken = authTokens.signToken(user, {
            expiresIn: security.cookies.refreshExpiresIn,
            tokenType: 'refresh',
        });
        authCookies.setAuthCookies(res, { accessToken: newAccessToken, refreshToken: newRefreshToken });

        return res.status(200).json({
            data: { refreshed: true },
            message: 'OK',
            errors: [],
            meta: {},
        });
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    register,
    login,
    verifyEmail,
    verifyAdminTwoFactor,
    resendVerification,
    forgotPassword,
    resetPassword,
    googleStart,
    googleCallback,
    logout,
    refresh,
};
