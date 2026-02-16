const { nodeEnv, csrfAllowedOrigins: validatedCsrfAllowedOrigins } = require('./index');
const { parseBoolean, parsePositiveInt } = require('../utils/env');
const { parseJwtExpiresInToMs } = require('../utils/jwt');

function parseSameSite(value, fallback = 'lax') {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'lax' || normalized === 'strict' || normalized === 'none') {
        return normalized;
    }

    return fallback;
}

const accessCookieName = (process.env.ACCESS_COOKIE_NAME || '').trim() || 'sg_access';
const refreshCookieName = (process.env.REFRESH_COOKIE_NAME || '').trim() || 'sg_refresh';
const csrfCookieName = (process.env.CSRF_COOKIE_NAME || '').trim() || 'sg_csrf';

const cookieSecureDefault = nodeEnv === 'production';
const cookieSecure = parseBoolean(process.env.COOKIE_SECURE, cookieSecureDefault);
const cookieSameSite = parseSameSite(process.env.COOKIE_SAMESITE, 'lax');
const cookieDomain = (process.env.COOKIE_DOMAIN || '').trim() || null;
const cookiePath = (process.env.COOKIE_PATH || '/').trim() || '/';

const cookieAccessExpiresIn = (process.env.AUTH_COOKIE_ACCESS_EXPIRES_IN || '').trim()
    || (process.env.JWT_EXPIRES_IN || '').trim()
    || '7d';
const cookieRefreshEnabled = parseBoolean(process.env.AUTH_COOKIE_REFRESH_ENABLED, false);
const cookieRefreshExpiresIn = (process.env.AUTH_COOKIE_REFRESH_EXPIRES_IN || '').trim() || '30d';

// CSRF usa la allowlist validada por el contrato estricto de entorno.
const csrfAllowedOrigins = Array.isArray(validatedCsrfAllowedOrigins)
    ? validatedCsrfAllowedOrigins
    : [];
const csrfRequireToken = parseBoolean(process.env.CSRF_REQUIRE_TOKEN, true);

const authRateLimitWindowMsRaw = process.env.AUTH_RATE_LIMIT_WINDOW_MS;
const authRateLimitWindowMs = authRateLimitWindowMsRaw ? Number(authRateLimitWindowMsRaw) : 60_000;
const rateLimitWindowMs = Number.isFinite(authRateLimitWindowMs) ? authRateLimitWindowMs : 60_000;

const rateLimit = {
    windowMs: rateLimitWindowMs,
    loginMax: parsePositiveInt(process.env.AUTH_RATE_LIMIT_LOGIN_MAX, 10),
    registerMax: parsePositiveInt(process.env.AUTH_RATE_LIMIT_REGISTER_MAX, 5),
    verifyEmailMax: parsePositiveInt(process.env.AUTH_RATE_LIMIT_VERIFY_EMAIL_MAX, 10),
    resendMax: parsePositiveInt(process.env.AUTH_RATE_LIMIT_RESEND_MAX, 5),
    admin2faMax: parsePositiveInt(process.env.AUTH_RATE_LIMIT_ADMIN_2FA_MAX, 10),
    refreshMax: parsePositiveInt(process.env.AUTH_RATE_LIMIT_REFRESH_MAX, 20),
};

module.exports = {
    cookies: {
        accessCookieName,
        refreshCookieName,
        csrfCookieName,
        secure: cookieSecure,
        sameSite: cookieSameSite,
        domain: cookieDomain,
        path: cookiePath,
        accessExpiresIn: cookieAccessExpiresIn,
        accessMaxAgeMs: parseJwtExpiresInToMs(cookieAccessExpiresIn),
        refreshEnabled: cookieRefreshEnabled,
        refreshExpiresIn: cookieRefreshExpiresIn,
        refreshMaxAgeMs: parseJwtExpiresInToMs(cookieRefreshExpiresIn),
    },
    csrf: {
        allowedOrigins: csrfAllowedOrigins,
        requireToken: csrfRequireToken,
    },
    rateLimit,
};
