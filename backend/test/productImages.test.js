const test = require('node:test');
const assert = require('node:assert/strict');

const adminRoutes = require('../src/routes/admin.routes');
const productImagesController = require('../src/controllers/productImages.controller');
const productImagesService = require('../src/services/productImages.service');
const r2 = require('../src/config/r2');
const r2Service = require('../src/services/r2.service');
const productImagesRepository = require('../src/repositories/productImages.repository');
const { ProductVariant, ProductVariantImage } = require('../src/models');

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

test('presignProductImage returns complete browser-ready contract', async () => {
    const originalFindByPk = ProductVariant.findByPk;
    const originalR2 = {
        endpoint: r2.endpoint,
        bucket: r2.bucket,
        accessKeyId: r2.accessKeyId,
        secretAccessKey: r2.secretAccessKey,
        region: r2.region,
        publicBaseUrl: r2.publicBaseUrl,
        presignExpiresSeconds: r2.presignExpiresSeconds,
        allowedImageContentTypes: [...r2.allowedImageContentTypes],
        maxImageBytes: r2.maxImageBytes,
    };

    try {
        ProductVariant.findByPk = async (id) => ({
            get() {
                return { id };
            },
        });

        r2.endpoint = 'https://example.r2.cloudflarestorage.com';
        r2.bucket = 'spacegurumis';
        r2.accessKeyId = 'AKIDEXAMPLE';
        r2.secretAccessKey = 'secret';
        r2.region = 'auto';
        r2.publicBaseUrl = 'https://assets.spacegurumis.lat';
        r2.presignExpiresSeconds = 120;
        r2.allowedImageContentTypes = ['image/webp'];
        r2.maxImageBytes = 1024 * 1024;

        const res = await productImagesService.presignProductImage(123, {
            contentType: 'image/webp',
            byteSize: 2048,
        });

        assert.equal(res.error, undefined);
        assert.ok(res.data);
        assert.ok(String(res.data.uploadUrl || '').includes('X-Amz-Signature='));
        assert.match(String(res.data.imageKey || ''), /^variants\/123\/[0-9a-f-]{36}\.webp$/);
        assert.equal(
            String(res.data.publicUrl || '').startsWith('https://assets.spacegurumis.lat/variants/123/'),
            true
        );
        assert.equal(Number(res.data.expiresInSeconds), 120);
    } finally {
        ProductVariant.findByPk = originalFindByPk;
        r2.endpoint = originalR2.endpoint;
        r2.bucket = originalR2.bucket;
        r2.accessKeyId = originalR2.accessKeyId;
        r2.secretAccessKey = originalR2.secretAccessKey;
        r2.region = originalR2.region;
        r2.publicBaseUrl = originalR2.publicBaseUrl;
        r2.presignExpiresSeconds = originalR2.presignExpiresSeconds;
        r2.allowedImageContentTypes = originalR2.allowedImageContentTypes;
        r2.maxImageBytes = originalR2.maxImageBytes;
    }
});

test('presignProductImage fails fast when R2 config is incomplete', async () => {
    const originalFindByPk = ProductVariant.findByPk;
    const originalEndpoint = r2.endpoint;
    const originalPublicBaseUrl = r2.publicBaseUrl;

    try {
        ProductVariant.findByPk = async (id) => ({
            get() {
                return { id };
            },
        });
        r2.endpoint = '';
        r2.publicBaseUrl = 'https://assets.spacegurumis.lat';

        const missingEndpoint = await productImagesService.presignProductImage(123, {
            contentType: 'image/webp',
            byteSize: 2048,
        });
        assert.equal(missingEndpoint.error, 'bad_request');
        assert.match(String(missingEndpoint.message || ''), /R2 endpoint no configurado/i);

        r2.endpoint = 'https://example.r2.cloudflarestorage.com';
        r2.publicBaseUrl = '';
        const missingPublicBase = await productImagesService.presignProductImage(123, {
            contentType: 'image/webp',
            byteSize: 2048,
        });
        assert.equal(missingPublicBase.error, 'bad_request');
        assert.match(String(missingPublicBase.message || ''), /R2_PUBLIC_BASE_URL no configurado/i);
    } finally {
        ProductVariant.findByPk = originalFindByPk;
        r2.endpoint = originalEndpoint;
        r2.publicBaseUrl = originalPublicBaseUrl;
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

test('registerProductImage rejects metadata mismatch and does not persist', async () => {
    const originalFindByPk = ProductVariant.findByPk;
    const originalHead = r2Service.headPublicObject;
    const originalCreate = productImagesRepository.createProductImage;
    const originalPublicBaseUrl = r2.publicBaseUrl;
    let createCalls = 0;

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
            contentType: 'image/png',
            byteSize: 123,
        });
        productImagesRepository.createProductImage = async (data) => {
            createCalls += 1;
            return data;
        };

        const res = await productImagesService.registerProductImage(123, {
            imageKey: 'variants/123/mismatch.webp',
            contentType: 'image/webp',
            byteSize: 123,
        });

        assert.equal(res.error, 'bad_request');
        assert.equal(res.code, 'register_content_type_mismatch');
        assert.match(String(res.message || ''), /contentType no coincide/i);
        assert.equal(createCalls, 0);
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

test('registerProductImage rejects missing R2 object and does not persist', async () => {
    const originalFindByPk = ProductVariant.findByPk;
    const originalHead = r2Service.headPublicObject;
    const originalCreate = productImagesRepository.createProductImage;
    const originalPublicBaseUrl = r2.publicBaseUrl;
    let createCalls = 0;

    try {
        ProductVariant.findByPk = async (id) => ({
            get() {
                return { id };
            },
        });
        r2.publicBaseUrl = 'https://assets.example.com';
        r2Service.headPublicObject = async () => ({ exists: false, status: 404 });
        productImagesRepository.createProductImage = async (data) => {
            createCalls += 1;
            return data;
        };

        const res = await productImagesService.registerProductImage(123, {
            imageKey: 'variants/123/missing.webp',
            contentType: 'image/webp',
            byteSize: 123,
        });

        assert.equal(res.error, 'bad_request');
        assert.equal(res.code, 'register_object_missing');
        assert.match(String(res.message || ''), /no existe en r2/i);
        assert.equal(createCalls, 0);
    } finally {
        ProductVariant.findByPk = originalFindByPk;
        r2Service.headPublicObject = originalHead;
        productImagesRepository.createProductImage = originalCreate;
        r2.publicBaseUrl = originalPublicBaseUrl;
    }
});

test('register failure keeps existing gallery state unchanged', async () => {
    const originalFindByPk = ProductVariant.findByPk;
    const originalHead = r2Service.headPublicObject;
    const originalCreate = productImagesRepository.createProductImage;
    const originalList = productImagesRepository.listProductImages;
    const originalPublicBaseUrl = r2.publicBaseUrl;

    const rows = [
        { id: 1, productVariantId: 123, imageKey: 'variants/123/existing.webp', sortOrder: 0 },
    ];

    try {
        ProductVariant.findByPk = async (id) => ({
            get() {
                return { id };
            },
        });
        r2.publicBaseUrl = 'https://assets.example.com';
        r2Service.headPublicObject = async () => ({ exists: false, status: 404 });
        productImagesRepository.createProductImage = async (data) => {
            rows.push({ id: 2, ...data });
            return data;
        };
        productImagesRepository.listProductImages = async () => rows.map((item) => ({ ...item }));

        const before = await productImagesService.listProductImages(123);
        assert.equal(before.error, undefined);
        assert.equal(before.data.length, 1);

        const failed = await productImagesService.registerProductImage(123, {
            imageKey: 'variants/123/new.webp',
            contentType: 'image/webp',
            byteSize: 123,
        });
        assert.equal(failed.error, 'bad_request');

        const after = await productImagesService.listProductImages(123);
        assert.equal(after.error, undefined);
        assert.equal(after.data.length, 1);
        assert.equal(after.data[0].imageKey, 'variants/123/existing.webp');
    } finally {
        ProductVariant.findByPk = originalFindByPk;
        r2Service.headPublicObject = originalHead;
        productImagesRepository.createProductImage = originalCreate;
        productImagesRepository.listProductImages = originalList;
        r2.publicBaseUrl = originalPublicBaseUrl;
    }
});

test('productImages.repository.listProductImages uses stable order by sortOrder then id', async () => {
    const originalFindAll = ProductVariantImage.findAll;
    let capturedOptions = null;

    try {
        ProductVariantImage.findAll = async (options) => {
            capturedOptions = options;
            return [];
        };

        const items = await productImagesRepository.listProductImages(123);
        assert.deepEqual(items, []);
        assert.deepEqual(capturedOptions && capturedOptions.where, { productVariantId: 123 });
        assert.deepEqual(capturedOptions && capturedOptions.order, [['sortOrder', 'ASC'], ['id', 'ASC']]);
    } finally {
        ProductVariantImage.findAll = originalFindAll;
    }
});

test('product image service list/update/delete keeps metadata and removes deleted rows', async () => {
    const originalFindByPk = ProductVariant.findByPk;
    const originalList = productImagesRepository.listProductImages;
    const originalUpdate = productImagesRepository.updateProductImage;
    const originalDelete = productImagesRepository.deleteProductImage;

    const rows = [
        { id: 11, productVariantId: 123, altText: 'B', sortOrder: 1 },
        { id: 10, productVariantId: 123, altText: 'A', sortOrder: 1 },
        { id: 9, productVariantId: 123, altText: 'C', sortOrder: 0 },
    ];

    function ordered() {
        return rows
            .slice()
            .sort((a, b) => (a.sortOrder - b.sortOrder) || (a.id - b.id))
            .map((item) => ({ ...item }));
    }

    try {
        ProductVariant.findByPk = async (id) => ({
            get() {
                return { id };
            },
        });
        productImagesRepository.listProductImages = async () => ordered();
        productImagesRepository.updateProductImage = async (variantId, imageId, patch) => {
            const index = rows.findIndex((item) => item.productVariantId === variantId && item.id === imageId);
            if (index < 0) {
                return null;
            }
            if (Object.prototype.hasOwnProperty.call(patch, 'altText')) {
                rows[index].altText = patch.altText === null ? null : String(patch.altText || '');
            }
            if (Object.prototype.hasOwnProperty.call(patch, 'sortOrder')) {
                rows[index].sortOrder = patch.sortOrder;
            }
            return { ...rows[index] };
        };
        productImagesRepository.deleteProductImage = async (variantId, imageId) => {
            const index = rows.findIndex((item) => item.productVariantId === variantId && item.id === imageId);
            if (index < 0) {
                return false;
            }
            rows.splice(index, 1);
            return true;
        };

        const before = await productImagesService.listProductImages(123);
        assert.deepEqual(before.data.map((item) => item.id), [9, 10, 11]);

        const updatedAlt = await productImagesService.updateProductImage(123, 10, { altText: 'Actualizado' });
        assert.equal(updatedAlt.error, undefined);
        const afterAlt = await productImagesService.listProductImages(123);
        assert.equal(afterAlt.data.find((item) => item.id === 10).altText, 'Actualizado');

        const updatedOrder = await productImagesService.updateProductImage(123, 11, { sortOrder: 0 });
        assert.equal(updatedOrder.error, undefined);
        const afterOrder = await productImagesService.listProductImages(123);
        assert.deepEqual(afterOrder.data.map((item) => item.id), [9, 11, 10]);

        const removed = await productImagesService.removeProductImage(123, 10);
        assert.equal(removed.error, undefined);
        assert.deepEqual(removed.data, { deleted: true });
        const afterDelete = await productImagesService.listProductImages(123);
        assert.deepEqual(afterDelete.data.map((item) => item.id), [9, 11]);
    } finally {
        ProductVariant.findByPk = originalFindByPk;
        productImagesRepository.listProductImages = originalList;
        productImagesRepository.updateProductImage = originalUpdate;
        productImagesRepository.deleteProductImage = originalDelete;
    }
});

test('variant image service rejects mismatched parent scope context', async () => {
    const originalFindByPk = ProductVariant.findByPk;

    try {
        ProductVariant.findByPk = async () => ({
            get() {
                return {
                    id: 123,
                    productId: 88,
                    product: {
                        id: 88,
                        categoryId: 7,
                    },
                };
            },
        });

        const byProduct = await productImagesService.listProductImages(123, { productId: 99 });
        assert.equal(byProduct.error, 'bad_request');
        assert.match(String(byProduct.message || ''), /no pertenece al producto/i);

        const byCategory = await productImagesService.listProductImages(123, { categoryId: 99 });
        assert.equal(byCategory.error, 'bad_request');
        assert.match(String(byCategory.message || ''), /no pertenece a la categoria/i);
    } finally {
        ProductVariant.findByPk = originalFindByPk;
    }
});
