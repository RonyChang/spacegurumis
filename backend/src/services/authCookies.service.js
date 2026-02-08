const crypto = require('crypto');

const security = require('../config/security');

function buildBaseCookieOptions() {
    const opts = {
        secure: !!security.cookies.secure,
        sameSite: security.cookies.sameSite,
        path: security.cookies.path,
    };

    if (security.cookies.domain) {
        opts.domain = security.cookies.domain;
    }

    return opts;
}

function buildAccessCookieOptions() {
    const opts = {
        ...buildBaseCookieOptions(),
        httpOnly: true,
    };

    if (Number.isFinite(security.cookies.accessMaxAgeMs) && security.cookies.accessMaxAgeMs > 0) {
        opts.maxAge = security.cookies.accessMaxAgeMs;
    }

    return opts;
}

function buildRefreshCookieOptions() {
    const opts = {
        ...buildBaseCookieOptions(),
        httpOnly: true,
    };

    if (Number.isFinite(security.cookies.refreshMaxAgeMs) && security.cookies.refreshMaxAgeMs > 0) {
        opts.maxAge = security.cookies.refreshMaxAgeMs;
    }

    return opts;
}

function buildCsrfCookieOptions() {
    // CSRF cookie must be readable by JS (double-submit).
    const opts = {
        ...buildBaseCookieOptions(),
        httpOnly: false,
    };

    // Align CSRF cookie lifetime with access cookie, but do not require it.
    if (Number.isFinite(security.cookies.accessMaxAgeMs) && security.cookies.accessMaxAgeMs > 0) {
        opts.maxAge = security.cookies.accessMaxAgeMs;
    }

    return opts;
}

function generateCsrfToken() {
    return crypto.randomBytes(32).toString('hex');
}

function setAuthCookies(res, { accessToken, refreshToken } = {}) {
    if (accessToken) {
        res.cookie(security.cookies.accessCookieName, accessToken, buildAccessCookieOptions());
    }

    if (security.cookies.refreshEnabled && refreshToken) {
        res.cookie(security.cookies.refreshCookieName, refreshToken, buildRefreshCookieOptions());
    }

    const csrfToken = generateCsrfToken();
    res.cookie(security.cookies.csrfCookieName, csrfToken, buildCsrfCookieOptions());

    return { csrfToken };
}

function clearAuthCookies(res) {
    const base = buildBaseCookieOptions();

    res.clearCookie(security.cookies.accessCookieName, { ...base, httpOnly: true });
    res.clearCookie(security.cookies.refreshCookieName, { ...base, httpOnly: true });
    res.clearCookie(security.cookies.csrfCookieName, { ...base, httpOnly: false });
}

module.exports = {
    setAuthCookies,
    clearAuthCookies,
};

