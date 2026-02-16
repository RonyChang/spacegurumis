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
        cookiesSet: [],
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.body = payload;
            return this;
        },
        cookie(name, value, options) {
            this.cookiesSet.push({ name, value, options });
            return this;
        },
    };
}

function assertSessionCookiesSet(res) {
    assert.ok(res.cookiesSet.some((cookie) => cookie.name === security.cookies.accessCookieName));
    assert.ok(res.cookiesSet.some((cookie) => cookie.name === security.cookies.csrfCookieName));
}

test('login returns cookie session without token field in JSON', async () => {
    const originalLoginUser = authService.loginUser;
    authService.loginUser = async () => ({
        user: {
            id: 'user-login-1',
            email: 'login@example.com',
            role: 'customer',
        },
    });

    try {
        const req = { body: { email: 'login@example.com', password: 'secret123' } };
        const res = createRes();
        let nextCalled = false;

        await authController.login(req, res, () => {
            nextCalled = true;
        });

        assert.equal(nextCalled, false);
        assert.equal(res.statusCode, 200);
        assert.ok(res.body && res.body.data && res.body.data.user);
        assert.equal('token' in res.body.data, false);
        assert.equal('token' in res.body.data.user, false);
        assertSessionCookiesSet(res);
    } finally {
        authService.loginUser = originalLoginUser;
    }
});

test('verifyEmail returns cookie session without token field in JSON', async () => {
    const originalVerifyEmail = authService.verifyEmail;
    authService.verifyEmail = async () => ({
        user: {
            id: 'user-verify-1',
            email: 'verify@example.com',
            role: 'customer',
        },
    });

    try {
        const req = { body: { email: 'verify@example.com', code: '123456' } };
        const res = createRes();
        let nextCalled = false;

        await authController.verifyEmail(req, res, () => {
            nextCalled = true;
        });

        assert.equal(nextCalled, false);
        assert.equal(res.statusCode, 200);
        assert.ok(res.body && res.body.data && res.body.data.user);
        assert.equal('token' in res.body.data, false);
        assert.equal('token' in res.body.data.user, false);
        assertSessionCookiesSet(res);
    } finally {
        authService.verifyEmail = originalVerifyEmail;
    }
});

test('verifyAdminTwoFactor returns cookie session without token field in JSON', async () => {
    const originalVerifyAdminTwoFactor = authService.verifyAdminTwoFactor;
    authService.verifyAdminTwoFactor = async () => ({
        user: {
            id: 'admin-2fa-1',
            email: 'admin@example.com',
            role: 'admin',
        },
    });

    try {
        const req = { body: { email: 'admin@example.com', code: '654321' } };
        const res = createRes();
        let nextCalled = false;

        await authController.verifyAdminTwoFactor(req, res, () => {
            nextCalled = true;
        });

        assert.equal(nextCalled, false);
        assert.equal(res.statusCode, 200);
        assert.ok(res.body && res.body.data && res.body.data.user);
        assert.equal('token' in res.body.data, false);
        assert.equal('token' in res.body.data.user, false);
        assertSessionCookiesSet(res);
    } finally {
        authService.verifyAdminTwoFactor = originalVerifyAdminTwoFactor;
    }
});
