const test = require('node:test');
const assert = require('node:assert/strict');

const adminRoutes = require('../src/routes/admin.routes');
const productImagesController = require('../src/controllers/productImages.controller');
const productImagesService = require('../src/services/productImages.service');
const r2 = require('../src/config/r2');
const r2Service = require('../src/services/r2.service');
const productImagesRepository = require('../src/repositories/productImages.repository');
const { ProductVariant } = require('../src/models');

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

test('admin routes for product images include auth + admin and CSRF on mutating methods', () => {
    const presign = findRoute(adminRoutes, '/api/v1/admin/variants/:id/images/presign', 'post');
    assert.ok(presign, 'presign route exists');
    const presignNames = routeMiddlewareNames(presign);
    assert.ok(presignNames.includes('authRequired'));
    assert.ok(presignNames.includes('csrfRequired'));
    assert.ok(presignNames.includes('adminRequired'));

    const create = findRoute(adminRoutes, '/api/v1/admin/variants/:id/images', 'post');
    assert.ok(create, 'create(post) route exists');
    const createNames = routeMiddlewareNames(create);
    assert.ok(createNames.includes('authRequired'));
    assert.ok(createNames.includes('csrfRequired'));
    assert.ok(createNames.includes('adminRequired'));

    const list = findRoute(adminRoutes, '/api/v1/admin/variants/:id/images', 'get');
    assert.ok(list, 'list(get) route exists');
    const listNames = routeMiddlewareNames(list);
    assert.ok(listNames.includes('authRequired'));
    assert.ok(listNames.includes('adminRequired'));
    assert.equal(listNames.includes('csrfRequired'), false);

    const update = findRoute(adminRoutes, '/api/v1/admin/variants/:id/images/:imageId', 'patch');
    assert.ok(update, 'update route exists');
    const updateNames = routeMiddlewareNames(update);
    assert.ok(updateNames.includes('authRequired'));
    assert.ok(updateNames.includes('csrfRequired'));
    assert.ok(updateNames.includes('adminRequired'));

    const remove = findRoute(adminRoutes, '/api/v1/admin/variants/:id/images/:imageId', 'delete');
    assert.ok(remove, 'remove route exists');
    const removeNames = routeMiddlewareNames(remove);
    assert.ok(removeNames.includes('authRequired'));
    assert.ok(removeNames.includes('csrfRequired'));
    assert.ok(removeNames.includes('adminRequired'));
});

test('productImages.controller.presign returns 400 when variantId is invalid', async () => {
    const res = makeRes();
    const next = () => {
        throw new Error('next should not be called');
    };

    await productImagesController.presign(
        { params: { id: 'abc' }, body: { contentType: 'image/webp', byteSize: 1 } },
        res,
        next
    );

    assert.equal(res.statusCode, 400);
    assert.equal(res.payload && res.payload.message, 'variantId invalido');
});

test('productImages.controller.presign maps service not_found to 404', async () => {
    const originalPresign = productImagesService.presignProductImage;
    try {
        productImagesService.presignProductImage = async () => ({ error: 'not_found' });

        const res = makeRes();
        const next = () => {
            throw new Error('next should not be called');
        };

        await productImagesController.presign(
            { params: { id: '123' }, body: { contentType: 'image/webp', byteSize: 1 } },
            res,
            next
        );

        assert.equal(res.statusCode, 404);
        assert.equal(res.payload && res.payload.message, 'Variante no encontrada');
    } finally {
        productImagesService.presignProductImage = originalPresign;
    }
});

test('registerProductImage derives publicUrl (does not accept arbitrary URL)', async () => {
    const originalFindByPk = ProductVariant.findByPk;
    const originalHead = r2Service.headPublicObject;
    const originalCreate = productImagesRepository.createProductImage;

    const originalPublicBaseUrl = r2.publicBaseUrl;

    const captured = { created: null };

    try {
        ProductVariant.findByPk = async (id) => ({
            get() {
                return { id };
            },
        });

        r2.publicBaseUrl = 'https://assets.example.com';

        r2Service.headPublicObject = async () => ({
            exists: true,
            status: 200,
            contentType: 'image/webp',
            byteSize: 123,
        });

        productImagesRepository.createProductImage = async (data) => {
            captured.created = data;
            return data;
        };

        const res = await productImagesService.registerProductImage(123, {
            imageKey: 'variants/123/abc.webp',
            contentType: 'image/webp',
            byteSize: 123,
            publicUrl: 'https://evil.example/hijack',
            altText: 'foto',
            sortOrder: 0,
        });

        assert.equal(res.error, undefined);
        assert.ok(res.data);
        assert.equal(res.data.publicUrl, 'https://assets.example.com/variants/123/abc.webp');
        assert.ok(captured.created);
        assert.equal(captured.created.publicUrl, 'https://assets.example.com/variants/123/abc.webp');
        assert.equal(captured.created.productVariantId, 123);
    } finally {
        ProductVariant.findByPk = originalFindByPk;
        r2Service.headPublicObject = originalHead;
        productImagesRepository.createProductImage = originalCreate;
        r2.publicBaseUrl = originalPublicBaseUrl;
    }
});

test('registerProductImage rejects unsupported content type', async () => {
    const originalFindByPk = ProductVariant.findByPk;
    const originalHead = r2Service.headPublicObject;
    const originalCreate = productImagesRepository.createProductImage;
    const originalPublicBaseUrl = r2.publicBaseUrl;

    try {
        ProductVariant.findByPk = async (id) => ({
            get() {
                return { id };
            },
        });
        r2.publicBaseUrl = 'https://assets.example.com';
        r2Service.headPublicObject = async () => ({ exists: true, status: 200, contentType: 'application/pdf', byteSize: 10 });
        productImagesRepository.createProductImage = async (data) => data;

        const res = await productImagesService.registerProductImage(123, {
            imageKey: 'variants/123/abc.pdf',
            contentType: 'application/pdf',
            byteSize: 10,
        });

        assert.equal(res.error, 'bad_request');
    } finally {
        ProductVariant.findByPk = originalFindByPk;
        r2Service.headPublicObject = originalHead;
        productImagesRepository.createProductImage = originalCreate;
        r2.publicBaseUrl = originalPublicBaseUrl;
    }
});

test('registerProductImage rejects invalid byteSize', async () => {
    const originalFindByPk = ProductVariant.findByPk;
    const originalPublicBaseUrl = r2.publicBaseUrl;

    try {
        ProductVariant.findByPk = async (id) => ({
            get() {
                return { id };
            },
        });
        r2.publicBaseUrl = 'https://assets.example.com';

        const res = await productImagesService.registerProductImage(123, {
            imageKey: 'variants/123/abc.webp',
            contentType: 'image/webp',
            byteSize: 0,
        });

        assert.equal(res.error, 'bad_request');
    } finally {
        ProductVariant.findByPk = originalFindByPk;
        r2.publicBaseUrl = originalPublicBaseUrl;
    }
});
