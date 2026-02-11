const test = require('node:test');
const assert = require('node:assert/strict');

const adminRoutes = require('../src/routes/admin.routes');
const adminDiscountsService = require('../src/services/adminDiscounts.service');
const discountRepository = require('../src/repositories/discount.repository');

function findRoute(router, path, method) {
    const m = String(method || '').toLowerCase();
    const layer = (router.stack || []).find((item) => item
        && item.route
        && item.route.path === path
        && item.route.methods
        && item.route.methods[m]);
    return layer ? layer.route : null;
}

function routeMiddlewareNames(route) {
    const stack = route && Array.isArray(route.stack) ? route.stack : [];
    return stack
        .map((layer) => layer && layer.handle && layer.handle.name)
        .filter(Boolean);
}

function clearModule(path) {
    delete require.cache[require.resolve(path)];
}

function buildDiscountGuardHarness() {
    const previousAllowedOrigins = process.env.CSRF_ALLOWED_ORIGINS;
    const previousRequireToken = process.env.CSRF_REQUIRE_TOKEN;
    process.env.CSRF_ALLOWED_ORIGINS = 'http://localhost:4321';
    process.env.CSRF_REQUIRE_TOKEN = 'true';

    clearModule('../src/config/security');
    clearModule('../src/middlewares/authRequired');
    clearModule('../src/middlewares/adminRequired');
    clearModule('../src/middlewares/csrfRequired');
    clearModule('../src/services/authTokens.service');

    const security = require('../src/config/security');
    const authTokens = require('../src/services/authTokens.service');
    const authRequired = require('../src/middlewares/authRequired');
    const adminRequired = require('../src/middlewares/adminRequired');
    const csrfRequired = require('../src/middlewares/csrfRequired');
    const originalVerifyAccessToken = authTokens.verifyAccessToken;
    authTokens.verifyAccessToken = (token) => {
        if (token === 'admin-token') {
            return { id: 1, role: 'admin' };
        }
        if (token === 'customer-token') {
            return { id: 2, role: 'customer' };
        }
        const error = new Error('Token invalido');
        error.status = 401;
        throw error;
    };

    const middlewares = [
        authRequired,
        csrfRequired,
        adminRequired,
        (_req, res) => res.status(201).json({ data: { created: true }, message: 'Creado', errors: [], meta: {} }),
    ];

    return {
        middlewares,
        security,
        restore() {
            authTokens.verifyAccessToken = originalVerifyAccessToken;
            if (previousAllowedOrigins === undefined) {
                delete process.env.CSRF_ALLOWED_ORIGINS;
            } else {
                process.env.CSRF_ALLOWED_ORIGINS = previousAllowedOrigins;
            }
            if (previousRequireToken === undefined) {
                delete process.env.CSRF_REQUIRE_TOKEN;
            } else {
                process.env.CSRF_REQUIRE_TOKEN = previousRequireToken;
            }
            clearModule('../src/config/security');
            clearModule('../src/middlewares/authRequired');
            clearModule('../src/middlewares/csrfRequired');
            clearModule('../src/services/authTokens.service');
        },
    };
}

function runMiddlewareChain(middlewares, { method = 'POST', headers = {}, cookies = {} } = {}) {
    const req = { method, headers, cookies, user: null };
    const responseState = {
        statusCode: 200,
        payload: null,
        finished: false,
    };
    const res = {
        status(code) {
            responseState.statusCode = code;
            return this;
        },
        json(payload) {
            responseState.payload = payload;
            responseState.finished = true;
            return this;
        },
    };

    let index = 0;
    function next() {
        if (responseState.finished) {
            return;
        }
        const middleware = middlewares[index++];
        if (!middleware) {
            return;
        }
        middleware(req, res, next);
    }

    next();
    return {
        status: responseState.statusCode,
        payload: responseState.payload,
    };
}

test('admin discount routes include auth/admin and csrf on POST', () => {
    const listRoute = findRoute(adminRoutes, '/api/v1/admin/discounts', 'get');
    assert.ok(listRoute, 'list discounts route exists');
    const listNames = routeMiddlewareNames(listRoute);
    assert.ok(listNames.includes('authRequired'));
    assert.ok(listNames.includes('adminRequired'));
    assert.equal(listNames.includes('csrfRequired'), false);

    const createRoute = findRoute(adminRoutes, '/api/v1/admin/discounts', 'post');
    assert.ok(createRoute, 'create discount route exists');
    const createNames = routeMiddlewareNames(createRoute);
    assert.ok(createNames.includes('authRequired'));
    assert.ok(createNames.includes('adminRequired'));
    assert.ok(createNames.includes('csrfRequired'));
});

test('admin discount POST returns 403 for authenticated non-admin (integration)', async () => {
    const { middlewares, security, restore } = buildDiscountGuardHarness();

    try {
        const csrfValue = 'csrf-token-123';
        const { status, payload } = runMiddlewareChain(middlewares, {
            headers: {
                origin: 'http://localhost:4321',
                'x-csrf-token': csrfValue,
            },
            cookies: {
                [security.cookies.accessCookieName]: 'customer-token',
                [security.cookies.csrfCookieName]: csrfValue,
            },
        });

        assert.equal(status, 403);
        assert.equal(payload && payload.message, 'Acceso denegado');
        assert.equal(payload && payload.errors && payload.errors[0] && payload.errors[0].message, 'Acceso denegado');
    } finally {
        restore();
    }
});

test('admin discount POST returns 403 when CSRF token is missing (integration)', async () => {
    const { middlewares, security, restore } = buildDiscountGuardHarness();

    try {
        const { status, payload } = runMiddlewareChain(middlewares, {
            headers: {
                origin: 'http://localhost:4321',
            },
            cookies: {
                [security.cookies.accessCookieName]: 'admin-token',
            },
        });

        assert.equal(status, 403);
        assert.equal(payload && payload.message, 'Acceso denegado');
        assert.equal(payload && payload.errors && payload.errors[0] && payload.errors[0].message, 'CSRF: token requerido');
    } finally {
        restore();
    }
});

test('adminDiscounts.service.createDiscount validates payload', async () => {
    let result = await adminDiscountsService.createDiscount({
        code: 'WELCOME10',
        percentage: 0,
    });
    assert.equal(result.error, 'bad_request');

    result = await adminDiscountsService.createDiscount({
        code: 'WELCOME10',
        percentage: 10,
        startsAt: 'not-a-date',
    });
    assert.equal(result.error, 'bad_request');
});

test('adminDiscounts.service.createDiscount normalizes values and maps conflict', async () => {
    const originalCreateDiscountCode = discountRepository.createDiscountCode;

    try {
        let capturedPayload = null;
        discountRepository.createDiscountCode = async (payload) => {
            capturedPayload = payload;
            return {
                id: 44,
                ...payload,
                usedCount: 0,
            };
        };

        let result = await adminDiscountsService.createDiscount({
            code: ' welcome10 ',
            percentage: 10,
            minSubtotal: 49.9,
            maxUses: 50,
            isActive: true,
        });
        assert.equal(result.error, undefined);
        assert.equal(capturedPayload.code, 'WELCOME10');
        assert.equal(capturedPayload.minSubtotalCents, 4990);
        assert.equal(result.data.code, 'WELCOME10');
        assert.equal(result.data.minSubtotal, 49.9);

        discountRepository.createDiscountCode = async () => {
            const error = new Error('duplicate code');
            error.name = 'SequelizeUniqueConstraintError';
            throw error;
        };
        result = await adminDiscountsService.createDiscount({
            code: 'WELCOME10',
            percentage: 10,
        });
        assert.equal(result.error, 'conflict');
    } finally {
        discountRepository.createDiscountCode = originalCreateDiscountCode;
    }
});

test('adminDiscounts.service.listDiscounts maps rows for admin UI', async () => {
    const originalListDiscountCodes = discountRepository.listDiscountCodes;

    try {
        discountRepository.listDiscountCodes = async () => ([
            {
                id: 1,
                code: 'WELCOME10',
                percentage: 10,
                isActive: true,
                startsAt: null,
                expiresAt: null,
                maxUses: 100,
                usedCount: 5,
                minSubtotalCents: 2500,
            },
        ]);

        const result = await adminDiscountsService.listDiscounts();
        assert.equal(Array.isArray(result.data), true);
        assert.equal(result.data[0].code, 'WELCOME10');
        assert.equal(result.data[0].minSubtotal, 25);
        assert.equal(result.data[0].usedCount, 5);
    } finally {
        discountRepository.listDiscountCodes = originalListDiscountCodes;
    }
});
