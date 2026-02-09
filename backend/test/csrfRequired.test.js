const test = require('node:test');
const assert = require('node:assert/strict');

// Ensure CSRF config is set before modules are loaded.
process.env.CSRF_ALLOWED_ORIGINS = process.env.CSRF_ALLOWED_ORIGINS
    || 'http://localhost:4321,https://spacegurumis.lat';
process.env.CSRF_REQUIRE_TOKEN = process.env.CSRF_REQUIRE_TOKEN || 'true';

const security = require('../src/config/security');
const csrfRequired = require('../src/middlewares/csrfRequired');

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
    return { res, nextCalled };
}

test('csrfRequired does not block non-mutating methods', () => {
    const req = { method: 'GET', user: { id: 'u', email: 'u@example.com', role: 'customer' }, headers: {}, cookies: {} };
    const { nextCalled } = runMiddleware(csrfRequired, req);
    assert.equal(nextCalled, true);
});

test('csrfRequired does not block unauthenticated mutating requests', () => {
    const req = {
        method: 'POST',
        headers: { origin: 'https://evil.example' },
        cookies: {},
    };
    const { nextCalled } = runMiddleware(csrfRequired, req);
    assert.equal(nextCalled, true);
});

test('csrfRequired rejects cookie-authenticated mutating requests with invalid origin', () => {
    const req = {
        method: 'POST',
        user: { id: 'u', email: 'u@example.com', role: 'customer' },
        headers: { origin: 'https://evil.example' },
        cookies: { [security.cookies.csrfCookieName]: 'abc' },
    };
    const { res, nextCalled } = runMiddleware(csrfRequired, req);
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
    assert.equal(res.body && res.body.message, 'Acceso denegado');
});

test('csrfRequired rejects cookie-authenticated mutating requests missing CSRF header', () => {
    const req = {
        method: 'POST',
        user: { id: 'u', email: 'u@example.com', role: 'customer' },
        headers: { origin: 'http://localhost:4321' },
        cookies: { [security.cookies.csrfCookieName]: 'abc' },
    };
    const { res, nextCalled } = runMiddleware(csrfRequired, req);
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
});

test('csrfRequired passes when origin is allowed and CSRF cookie/header match', () => {
    const req = {
        method: 'POST',
        user: { id: 'u', email: 'u@example.com', role: 'customer' },
        headers: { origin: 'http://localhost:4321', 'x-csrf-token': 'abc' },
        cookies: { [security.cookies.csrfCookieName]: 'abc' },
    };
    const { nextCalled } = runMiddleware(csrfRequired, req);
    assert.equal(nextCalled, true);
});
