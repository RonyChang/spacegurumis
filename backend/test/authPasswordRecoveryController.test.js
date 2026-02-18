const test = require('node:test');
const assert = require('node:assert/strict');

const authController = require('../src/controllers/auth.controller');
const authService = require('../src/services/auth.service');

function createRes() {
    return {
        statusCode: 200,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.body = payload;
            return this;
        },
    };
}

test('forgotPassword returns generic 200 response for valid payload', async () => {
    const originalRequestPasswordReset = authService.requestPasswordReset;

    try {
        let calledWith = null;
        authService.requestPasswordReset = async (payload) => {
            calledWith = payload;
            return { accepted: true };
        };

        const req = { body: { email: 'user@example.com' } };
        const res = createRes();
        let nextCalled = false;

        await authController.forgotPassword(req, res, () => {
            nextCalled = true;
        });

        assert.equal(nextCalled, false);
        assert.equal(res.statusCode, 200);
        assert.deepEqual(calledWith, { email: 'user@example.com' });
        assert.deepEqual(res.body && res.body.data, { accepted: true });
    } finally {
        authService.requestPasswordReset = originalRequestPasswordReset;
    }
});

test('forgotPassword rejects invalid email payload', async () => {
    const req = { body: { email: 'invalid-email' } };
    const res = createRes();

    await authController.forgotPassword(req, res, () => {});

    assert.equal(res.statusCode, 400);
    assert.equal(res.body && res.body.message, 'Datos inválidos');
});

test('resetPassword calls service for valid token/password payload', async () => {
    const originalResetPassword = authService.resetPassword;

    try {
        let calledWith = null;
        authService.resetPassword = async (payload) => {
            calledWith = payload;
            return { reset: true };
        };

        const req = { body: { token: 'a'.repeat(64), newPassword: 'secret123' } };
        const res = createRes();
        let nextCalled = false;

        await authController.resetPassword(req, res, () => {
            nextCalled = true;
        });

        assert.equal(nextCalled, false);
        assert.equal(res.statusCode, 200);
        assert.deepEqual(calledWith, { token: 'a'.repeat(64), newPassword: 'secret123' });
        assert.deepEqual(res.body && res.body.data, { reset: true });
    } finally {
        authService.resetPassword = originalResetPassword;
    }
});

test('resetPassword rejects weak replacement password payload', async () => {
    const req = { body: { token: 'a'.repeat(64), newPassword: '123' } };
    const res = createRes();

    await authController.resetPassword(req, res, () => {});

    assert.equal(res.statusCode, 400);
    assert.equal(res.body && res.body.message, 'Datos inválidos');
});
