const { nodeEnv } = require('./index');

function parseBoolean(value, defaultValue = false) {
    if (value === undefined || value === null) {
        return defaultValue;
    }

    const normalized = String(value).trim().toLowerCase();
    if (!normalized) {
        return defaultValue;
    }

    return ['1', 'true', 'yes', 'y', 'on'].includes(normalized);
}

function parseCsv(value) {
    if (value === undefined || value === null) {
        return [];
    }

    return String(value)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

function normalizeOrigin(value) {
    const trimmed = String(value || '').trim();
    if (!trimmed) {
        return '';
    }

    return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

function parseSameSite(value, fallback = 'lax') {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'lax' || normalized === 'strict' || normalized === 'none') {
        return normalized;
    }

    return fallback;
}

// JWT expiry strings in this project use patterns like "15m", "7d".
function parseJwtExpiresInToMs(expiresIn) {
    if (expiresIn === undefined || expiresIn === null) {
        return null;
    }

    const raw = String(expiresIn).trim();
    if (!raw) {
        return null;
    }

    // Numeric strings: treat as seconds (jsonwebtoken behavior).
    if (/^\d+$/.test(raw)) {
        const seconds = Number(raw);
        return Number.isFinite(seconds) ? seconds * 1000 : null;
    }

    const match = raw.match(/^(\d+)(ms|s|m|h|d)$/i);
    if (!match) {
        return null;
    }

    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    if (!Number.isFinite(amount)) {
        return null;
    }

    const multipliers = {
        ms: 1,
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
    };

    return amount * (multipliers[unit] || 0);
}

const accessCookieName = process.env.ACCESS_COOKIE_NAME
    || process.env.AUTH_COOKIE_ACCESS_NAME
    || 'sg_access';
const refreshCookieName = process.env.REFRESH_COOKIE_NAME
    || process.env.AUTH_COOKIE_REFRESH_NAME
    || 'sg_refresh';
const csrfCookieName = process.env.CSRF_COOKIE_NAME
    || process.env.AUTH_COOKIE_CSRF_NAME
    || 'sg_csrf';

const cookieSecureDefault = nodeEnv === 'production';
const cookieSecure = parseBoolean(process.env.COOKIE_SECURE || process.env.AUTH_COOKIE_SECURE, cookieSecureDefault);
const cookieSameSite = parseSameSite(process.env.COOKIE_SAMESITE || process.env.AUTH_COOKIE_SAMESITE, 'lax');
const cookieDomain = (process.env.COOKIE_DOMAIN || process.env.AUTH_COOKIE_DOMAIN || '').trim() || null;
const cookiePath = (process.env.COOKIE_PATH || process.env.AUTH_COOKIE_PATH || '/').trim() || '/';

const cookieAccessExpiresIn = (process.env.AUTH_COOKIE_ACCESS_EXPIRES_IN || '').trim()
    || (process.env.JWT_EXPIRES_IN || '').trim()
    || '7d';
const cookieRefreshEnabled = parseBoolean(process.env.AUTH_COOKIE_REFRESH_ENABLED, false);
const cookieRefreshExpiresIn = (process.env.AUTH_COOKIE_REFRESH_EXPIRES_IN || '').trim() || '30d';

let csrfAllowedOrigins = parseCsv(process.env.CSRF_ALLOWED_ORIGINS)
    .map(normalizeOrigin)
    .filter(Boolean);
if (!csrfAllowedOrigins.length) {
    const frontendBaseUrl = (process.env.FRONTEND_BASE_URL || '').trim();
    if (frontendBaseUrl) {
        try {
            csrfAllowedOrigins = [normalizeOrigin(new URL(frontendBaseUrl).origin)].filter(Boolean);
        } catch {
            // Ignore malformed FRONTEND_BASE_URL; CSRF_ALLOWED_ORIGINS should be set explicitly.
        }
    }
}
const csrfRequireToken = parseBoolean(process.env.CSRF_REQUIRE_TOKEN, true);

const authRateLimitWindowMsRaw = process.env.AUTH_RATE_LIMIT_WINDOW_MS;
const authRateLimitWindowMs = authRateLimitWindowMsRaw ? Number(authRateLimitWindowMsRaw) : 60_000;
const rateLimitWindowMs = Number.isFinite(authRateLimitWindowMs) ? authRateLimitWindowMs : 60_000;

function parsePositiveInt(value, fallback) {
    const parsed = value === undefined || value === null ? NaN : Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }

    return Math.floor(parsed);
}

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
