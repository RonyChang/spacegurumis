const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const security = require('../src/config/security');
const authTokens = require('../src/services/authTokens.service');
const authRequired = require('../src/middlewares/authRequired');

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

function runMiddleware(mw, req) {
    const res = createRes();
    let nextCalled = false;
    mw(req, res, () => {
        nextCalled = true;
    });
    return { req, res, nextCalled };
}

test('authRequired rejects Authorization: Bearer when access cookie is missing', () => {
    const user = { id: 'user-a', email: 'a@example.com', role: 'customer' };
    const bearerToken = authTokens.signToken(user, { expiresIn: '1h', tokenType: 'access' });

    const req = { headers: { authorization: `Bearer ${bearerToken}` }, cookies: {} };
    const { res, nextCalled } = runMiddleware(authRequired, req);

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
});

test('authRequired accepts access cookie when Authorization header is absent', () => {
    const user = { id: 'user-cookie', email: 'cookie@example.com', role: 'customer' };
    const cookieToken = authTokens.signToken(user, { expiresIn: '1h', tokenType: 'access' });

    const req = {
        headers: {},
        cookies: { [security.cookies.accessCookieName]: cookieToken },
    };

    const { nextCalled } = runMiddleware(authRequired, req);

    assert.equal(nextCalled, true);
    assert.deepEqual(req.user, { id: user.id, email: user.email, role: user.role });
});

test('authRequired returns 401 when no access cookie is present', () => {
    const req = { headers: {}, cookies: {} };
    const { res, nextCalled } = runMiddleware(authRequired, req);

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
    assert.equal(res.body && res.body.message, 'No autorizado');
});

test('authRequired prioritizes valid access cookie even when Authorization header is invalid', () => {
    const user = { id: 'cookie-priority', email: 'priority@example.com', role: 'customer' };
    const cookieToken = authTokens.signToken(user, { expiresIn: '1h', tokenType: 'access' });

    const req = {
        headers: { authorization: 'Bearer totally-invalid-token' },
        cookies: { [security.cookies.accessCookieName]: cookieToken },
    };
    const { nextCalled, res } = runMiddleware(authRequired, req);

    assert.equal(nextCalled, true);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(req.user, { id: user.id, email: user.email, role: user.role });
});
