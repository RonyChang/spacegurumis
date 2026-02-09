const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const security = require('../src/config/security');
const authService = require('../src/services/auth.service');
const authController = require('../src/controllers/auth.controller');

function snapshotEnvVar(name) {
    return {
        had: Object.prototype.hasOwnProperty.call(process.env, name),
        value: process.env[name],
    };
}

function restoreEnvVar(name, snapshot) {
    if (!snapshot.had) {
        delete process.env[name];
        return;
    }

    process.env[name] = snapshot.value;
}

function createRes() {
    return {
        statusCode: 200,
        body: null,
        redirectUrl: null,
        cookiesSet: [],
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.body = payload;
            return this;
        },
        redirect(url) {
            this.redirectUrl = url;
            return this;
        },
        cookie(name, value, options) {
            this.cookiesSet.push({ name, value, options });
            return this;
        },
        clearCookie() {
            return this;
        },
    };
}

test('googleCallback redirects to /login without token and sets cookies', async () => {
    const frontendBaseUrlSnapshot = snapshotEnvVar('FRONTEND_BASE_URL');
    const originalLoginWithGoogle = authService.loginWithGoogle;

    process.env.FRONTEND_BASE_URL = 'https://spacegurumis.lat';
    authService.loginWithGoogle = async () => ({
        user: { id: 'user-1', email: 'user@example.com', role: 'customer' },
    });

    try {
        const req = { query: { code: 'test-code' } };
        const res = createRes();
        let nextCalled = false;

        await authController.googleCallback(req, res, () => {
            nextCalled = true;
        });

        assert.equal(nextCalled, false);
        assert.ok(res.redirectUrl);
        assert.ok(res.redirectUrl.endsWith('/login'));
        assert.equal(res.redirectUrl.includes('token='), false);
        assert.ok(res.cookiesSet.some((c) => c.name === security.cookies.accessCookieName));
        assert.ok(res.cookiesSet.some((c) => c.name === security.cookies.csrfCookieName));
    } finally {
        restoreEnvVar('FRONTEND_BASE_URL', frontendBaseUrlSnapshot);
        authService.loginWithGoogle = originalLoginWithGoogle;
    }
});

test('googleCallback redirects with error hash and no token when code is missing', async () => {
    const frontendBaseUrlSnapshot = snapshotEnvVar('FRONTEND_BASE_URL');
    const originalLoginWithGoogle = authService.loginWithGoogle;

    process.env.FRONTEND_BASE_URL = 'https://spacegurumis.lat';
    authService.loginWithGoogle = async () => {
        throw new Error('loginWithGoogle should not be called when code is missing');
    };

    try {
        const req = { query: {} };
        const res = createRes();
        let nextCalled = false;

        await authController.googleCallback(req, res, () => {
            nextCalled = true;
        });

        assert.equal(nextCalled, false);
        assert.ok(res.redirectUrl);
        assert.equal(res.redirectUrl.includes('token='), false);
        assert.equal(res.cookiesSet.length, 0);

        const url = new URL(res.redirectUrl);
        assert.equal(url.origin, 'https://spacegurumis.lat');
        assert.equal(url.pathname, '/login');
        assert.ok(url.hash.startsWith('#error='));
    } finally {
        restoreEnvVar('FRONTEND_BASE_URL', frontendBaseUrlSnapshot);
        authService.loginWithGoogle = originalLoginWithGoogle;
    }
});

test('googleCallback JSON mode returns 200 without token in body and sets cookies', async () => {
    const frontendBaseUrlSnapshot = snapshotEnvVar('FRONTEND_BASE_URL');
    const originalLoginWithGoogle = authService.loginWithGoogle;

    delete process.env.FRONTEND_BASE_URL;
    authService.loginWithGoogle = async () => ({
        user: { id: 'user-1', email: 'user@example.com', role: 'customer' },
    });

    try {
        const req = { query: { code: 'test-code' } };
        const res = createRes();
        let nextCalled = false;

        await authController.googleCallback(req, res, () => {
            nextCalled = true;
        });

        assert.equal(nextCalled, false);
        assert.equal(res.redirectUrl, null);
        assert.equal(res.statusCode, 200);
        assert.ok(res.body && res.body.data);
        assert.equal('token' in res.body.data, false);
        assert.ok(res.cookiesSet.some((c) => c.name === security.cookies.accessCookieName));
        assert.ok(res.cookiesSet.some((c) => c.name === security.cookies.csrfCookieName));
    } finally {
        restoreEnvVar('FRONTEND_BASE_URL', frontendBaseUrlSnapshot);
        authService.loginWithGoogle = originalLoginWithGoogle;
    }
});
