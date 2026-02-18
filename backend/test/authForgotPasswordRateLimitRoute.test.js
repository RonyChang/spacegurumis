const test = require('node:test');
const assert = require('node:assert/strict');

const security = require('../src/config/security');
const authRoutes = require('../src/routes/auth.routes');
const authService = require('../src/services/auth.service');

function findRouteHandlers(path, method) {
    const normalizedMethod = String(method || '').toLowerCase();
    const routeLayer = authRoutes.stack.find((layer) => (
        layer && layer.route
        && layer.route.path === path
        && layer.route.methods
        && layer.route.methods[normalizedMethod]
    ));

    if (!routeLayer) {
        throw new Error(`Route not found: ${method.toUpperCase()} ${path}`);
    }

    return routeLayer.route.stack.map((layer) => layer.handle);
}

function createReq(body) {
    return {
        body,
        ip: '10.20.30.40',
        headers: {},
    };
}

function createRes() {
    return {
        statusCode: 200,
        body: null,
        headers: {},
        setHeader(name, value) {
            this.headers[String(name).toLowerCase()] = String(value);
        },
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

async function runRoute(handlers, req, res) {
    const [limiter, controller] = handlers;
    let allowed = false;

    await limiter(req, res, () => {
        allowed = true;
    });

    if (!allowed) {
        return;
    }

    await controller(req, res, (error) => {
        if (error) {
            throw error;
        }
    });
}

test('POST /api/v1/auth/password/forgot returns 429 after exceeding route limiter', async () => {
    const originalRequestPasswordReset = authService.requestPasswordReset;
    const handlers = findRouteHandlers('/api/v1/auth/password/forgot', 'post');
    const maxAllowed = security.rateLimit.forgotPasswordMax;

    authService.requestPasswordReset = async () => ({ accepted: true });

    try {
        for (let index = 0; index < maxAllowed; index += 1) {
            const req = createReq({ email: `rate-limit-${index}@example.com` });
            const res = createRes();
            await runRoute(handlers, req, res);
            assert.equal(res.statusCode, 200);
        }

        const blockedReq = createReq({ email: 'rate-limit-final@example.com' });
        const blockedRes = createRes();
        await runRoute(handlers, blockedReq, blockedRes);

        assert.equal(blockedRes.statusCode, 429);
        assert.equal(blockedRes.body && blockedRes.body.message, 'Demasiadas solicitudes');
        assert.ok(Number(blockedRes.headers['retry-after']) >= 1);
    } finally {
        authService.requestPasswordReset = originalRequestPasswordReset;
    }
});
