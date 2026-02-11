const test = require('node:test');
const assert = require('node:assert/strict');

const security = require('../src/config/security');
const adminRoutes = require('../src/routes/admin.routes');
const adminUsersController = require('../src/controllers/adminUsers.controller');
const adminUsersService = require('../src/services/adminUsers.service');
const adminUsersRepository = require('../src/repositories/adminUsers.repository');

function makeRes() {
    return {
        statusCode: 200,
        payload: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(value) {
            this.payload = value;
            return this;
        },
    };
}

function runMiddleware(mw, req) {
    const res = makeRes();
    let nextCalled = false;
    mw(req, res, () => {
        nextCalled = true;
    });
    return { res, nextCalled };
}

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

test('admin users routes include auth/admin and csrf on mutating endpoint', () => {
    const list = findRoute(adminRoutes, '/api/v1/admin/users', 'get');
    assert.ok(list, 'list route exists');
    const listNames = routeMiddlewareNames(list);
    assert.ok(listNames.includes('authRequired'));
    assert.ok(listNames.includes('adminRequired'));
    assert.equal(listNames.includes('csrfRequired'), false);

    const create = findRoute(adminRoutes, '/api/v1/admin/users', 'post');
    assert.ok(create, 'create route exists');
    const createNames = routeMiddlewareNames(create);
    assert.ok(createNames.includes('authRequired'));
    assert.ok(createNames.includes('adminRequired'));
    assert.ok(createNames.includes('csrfRequired'));
});

test('adminUsers.controller.list returns 200 with meta total', async () => {
    const originalList = adminUsersService.listAdminUsers;

    try {
        adminUsersService.listAdminUsers = async () => ({
            data: [
                { id: 1, email: 'a@example.com', role: 'admin' },
                { id: 2, email: 'b@example.com', role: 'admin' },
            ],
        });

        const res = makeRes();
        const next = () => {
            throw new Error('next should not be called');
        };

        await adminUsersController.list({}, res, next);

        assert.equal(res.statusCode, 200);
        assert.equal(res.payload.meta.total, 2);
    } finally {
        adminUsersService.listAdminUsers = originalList;
    }
});

test('adminUsers.controller.create returns 201 on success', async () => {
    const originalCreate = adminUsersService.createOrPromoteAdmin;

    try {
        adminUsersService.createOrPromoteAdmin = async () => ({
            data: {
                action: 'created',
                user: { id: 1, email: 'admin@example.com', role: 'admin' },
            },
        });

        const req = { body: { email: 'admin@example.com', password: 'Secret123' } };
        const res = makeRes();
        const next = () => {
            throw new Error('next should not be called');
        };

        await adminUsersController.create(req, res, next);

        assert.equal(res.statusCode, 201);
        assert.equal(res.payload.data.action, 'created');
    } finally {
        adminUsersService.createOrPromoteAdmin = originalCreate;
    }
});

test('adminUsers.controller.create maps bad_request to 400', async () => {
    const originalCreate = adminUsersService.createOrPromoteAdmin;

    try {
        adminUsersService.createOrPromoteAdmin = async () => ({
            error: 'bad_request',
            message: 'Email invalido',
        });

        const res = makeRes();
        const next = () => {
            throw new Error('next should not be called');
        };

        await adminUsersController.create({ body: { email: 'x' } }, res, next);

        assert.equal(res.statusCode, 400);
        assert.equal(res.payload.message, 'Email invalido');
    } finally {
        adminUsersService.createOrPromoteAdmin = originalCreate;
    }
});

test('adminUsers.controller.create maps conflict to 409', async () => {
    const originalCreate = adminUsersService.createOrPromoteAdmin;

    try {
        adminUsersService.createOrPromoteAdmin = async () => ({
            error: 'conflict',
            message: 'El usuario ya es admin',
        });

        const res = makeRes();
        const next = () => {
            throw new Error('next should not be called');
        };

        await adminUsersController.create({ body: { email: 'admin@example.com' } }, res, next);

        assert.equal(res.statusCode, 409);
        assert.equal(res.payload.message, 'El usuario ya es admin');
    } finally {
        adminUsersService.createOrPromoteAdmin = originalCreate;
    }
});

test('admin users create route rejects non-admin role with 403', () => {
    const create = findRoute(adminRoutes, '/api/v1/admin/users', 'post');
    assert.ok(create, 'create route exists');

    const middlewares = Array.isArray(create.stack) ? create.stack : [];
    const adminMwLayer = middlewares.find((layer) => layer && layer.handle && layer.handle.name === 'adminRequired');
    assert.ok(adminMwLayer, 'adminRequired middleware exists');

    const req = {
        user: { id: 10, email: 'customer@example.com', role: 'customer' },
    };
    const { res, nextCalled } = runMiddleware(adminMwLayer.handle, req);
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
});

test('admin users create route rejects missing csrf token with 403', () => {
    const create = findRoute(adminRoutes, '/api/v1/admin/users', 'post');
    assert.ok(create, 'create route exists');

    const middlewares = Array.isArray(create.stack) ? create.stack : [];
    const csrfMwLayer = middlewares.find((layer) => layer && layer.handle && layer.handle.name === 'csrfRequired');
    assert.ok(csrfMwLayer, 'csrfRequired middleware exists');

    const req = {
        method: 'POST',
        user: { id: 1, email: 'admin@example.com', role: 'admin' },
        headers: { origin: 'http://localhost:4321' },
        cookies: { [security.cookies.csrfCookieName]: 'token-cookie' },
    };

    const { res, nextCalled } = runMiddleware(csrfMwLayer.handle, req);
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
});

test('adminUsers.service.createOrPromoteAdmin promotes existing non-admin user by email', async () => {
    const originalFindUserByEmail = adminUsersRepository.findUserByEmail;
    const originalUpdateUserRole = adminUsersRepository.updateUserRole;
    const originalCreateUser = adminUsersRepository.createUser;

    let createUserCalled = 0;

    try {
        adminUsersRepository.findUserByEmail = async () => ({
            id: 99,
            email: 'customer@example.com',
            firstName: 'Customer',
            lastName: 'User',
            role: 'customer',
            isActive: true,
            emailVerifiedAt: null,
            createdAt: null,
            updatedAt: null,
        });
        adminUsersRepository.updateUserRole = async (userId, role) => ({
            id: userId,
            email: 'customer@example.com',
            firstName: 'Customer',
            lastName: 'User',
            role,
            isActive: true,
            emailVerifiedAt: null,
            createdAt: null,
            updatedAt: null,
        });
        adminUsersRepository.createUser = async () => {
            createUserCalled += 1;
            return null;
        };

        const result = await adminUsersService.createOrPromoteAdmin({
            email: 'customer@example.com',
        });

        assert.equal(result.error, undefined);
        assert.equal(result.data.action, 'promoted');
        assert.equal(result.data.user.role, 'admin');
        assert.equal(createUserCalled, 0);
    } finally {
        adminUsersRepository.findUserByEmail = originalFindUserByEmail;
        adminUsersRepository.updateUserRole = originalUpdateUserRole;
        adminUsersRepository.createUser = originalCreateUser;
    }
});
