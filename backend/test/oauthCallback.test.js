const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const security = require('../src/config/security');
const authService = require('../src/services/auth.service');
const authController = require('../src/controllers/auth.controller');

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
    const originalFrontendBaseUrl = process.env.FRONTEND_BASE_URL;
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
        process.env.FRONTEND_BASE_URL = originalFrontendBaseUrl;
        authService.loginWithGoogle = originalLoginWithGoogle;
    }
});

