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

test('authRequired prefers Authorization: Bearer over access cookie', () => {
    const userA = { id: 'user-a', email: 'a@example.com', role: 'customer' };
    const userB = { id: 'user-b', email: 'b@example.com', role: 'customer' };

    const bearerToken = authTokens.signToken(userA, { expiresIn: '1h', tokenType: 'access' });
    const cookieToken = authTokens.signToken(userB, { expiresIn: '1h', tokenType: 'access' });

    const req = {
        headers: { authorization: `Bearer ${bearerToken}` },
        cookies: { [security.cookies.accessCookieName]: cookieToken },
    };

    const { nextCalled } = runMiddleware(authRequired, req);

    assert.equal(nextCalled, true);
    assert.deepEqual(req.user, { id: userA.id, email: userA.email, role: userA.role });
    assert.equal(req.authMethod, 'bearer');
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
    assert.equal(req.authMethod, 'cookie');
});

test('authRequired returns 401 when no bearer token and no access cookie', () => {
    const req = { headers: {}, cookies: {} };
    const { res, nextCalled } = runMiddleware(authRequired, req);

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
    assert.equal(res.body && res.body.message, 'No autorizado');
});

