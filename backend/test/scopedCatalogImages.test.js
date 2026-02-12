const test = require('node:test');
const assert = require('node:assert/strict');

const adminRoutes = require('../src/routes/admin.routes');
const scopedCatalogImagesService = require('../src/services/scopedCatalogImages.service');
const scopedCatalogImagesRepository = require('../src/repositories/scopedCatalogImages.repository');
const r2Service = require('../src/services/r2.service');
const r2 = require('../src/config/r2');
const { sequelize } = require('../src/models');

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

test('scoped catalog image routes include auth/admin and csrf on mutating endpoints', () => {
    const categoryPresign = findRoute(adminRoutes, '/api/v1/admin/categories/:id/images/presign', 'post');
    assert.ok(categoryPresign, 'category presign route exists');
    const categoryPresignNames = routeMiddlewareNames(categoryPresign);
    assert.ok(categoryPresignNames.includes('authRequired'));
    assert.ok(categoryPresignNames.includes('adminRequired'));
    assert.ok(categoryPresignNames.includes('csrfRequired'));

    const categoryList = findRoute(adminRoutes, '/api/v1/admin/categories/:id/images', 'get');
    assert.ok(categoryList, 'category list route exists');
    const categoryListNames = routeMiddlewareNames(categoryList);
    assert.ok(categoryListNames.includes('authRequired'));
    assert.ok(categoryListNames.includes('adminRequired'));
    assert.equal(categoryListNames.includes('csrfRequired'), false);

    const productPresign = findRoute(adminRoutes, '/api/v1/admin/products/:id/images/presign', 'post');
    assert.ok(productPresign, 'product presign route exists');
    const productPresignNames = routeMiddlewareNames(productPresign);
    assert.ok(productPresignNames.includes('authRequired'));
    assert.ok(productPresignNames.includes('adminRequired'));
    assert.ok(productPresignNames.includes('csrfRequired'));

    const productDelete = findRoute(adminRoutes, '/api/v1/admin/products/:id/images/:imageId', 'delete');
    assert.ok(productDelete, 'product delete image route exists');
    const productDeleteNames = routeMiddlewareNames(productDelete);
    assert.ok(productDeleteNames.includes('authRequired'));
    assert.ok(productDeleteNames.includes('adminRequired'));
    assert.ok(productDeleteNames.includes('csrfRequired'));
});

test('category scope keeps a single effective image after replacement', async () => {
    const originalTransaction = sequelize.transaction;
    const originalFindCategoryById = scopedCatalogImagesRepository.findCategoryById;
    const originalDeleteCategoryImagesByCategory = scopedCatalogImagesRepository.deleteCategoryImagesByCategory;
    const originalCreateCategoryImage = scopedCatalogImagesRepository.createCategoryImage;
    const originalListCategoryImages = scopedCatalogImagesRepository.listCategoryImages;
    const originalHeadPublicObject = r2Service.headPublicObject;
    const originalPublicBaseUrl = r2.publicBaseUrl;

    let current = null;

    try {
        sequelize.transaction = async (callback) => callback({ id: 'tx' });
        scopedCatalogImagesRepository.findCategoryById = async (id) => ({ id, name: 'Amigurumis' });
        scopedCatalogImagesRepository.deleteCategoryImagesByCategory = async () => {
            current = null;
            return 1;
        };
        scopedCatalogImagesRepository.createCategoryImage = async (data) => {
            current = {
                id: current ? current.id + 1 : 1,
                ...data,
            };
            return current;
        };
        scopedCatalogImagesRepository.listCategoryImages = async () => (current ? [current] : []);
        r2Service.headPublicObject = async () => ({
            exists: true,
            status: 200,
            contentType: 'image/webp',
            byteSize: 100,
        });
        r2.publicBaseUrl = 'https://assets.example.com';

        const first = await scopedCatalogImagesService.registerCategoryImage(10, {
            imageKey: 'categories/10/first.webp',
            contentType: 'image/webp',
            byteSize: 100,
            altText: 'primera',
        });
        assert.equal(first.error, undefined);
        assert.equal(first.data.categoryId, 10);

        const second = await scopedCatalogImagesService.registerCategoryImage(10, {
            imageKey: 'categories/10/second.webp',
            contentType: 'image/webp',
            byteSize: 100,
            altText: 'segunda',
        });
        assert.equal(second.error, undefined);

        const listed = await scopedCatalogImagesService.listCategoryImages(10);
        assert.equal(listed.error, undefined);
        assert.equal(listed.data.length, 1);
        assert.equal(listed.data[0].imageKey, 'categories/10/second.webp');
    } finally {
        sequelize.transaction = originalTransaction;
        scopedCatalogImagesRepository.findCategoryById = originalFindCategoryById;
        scopedCatalogImagesRepository.deleteCategoryImagesByCategory = originalDeleteCategoryImagesByCategory;
        scopedCatalogImagesRepository.createCategoryImage = originalCreateCategoryImage;
        scopedCatalogImagesRepository.listCategoryImages = originalListCategoryImages;
        r2Service.headPublicObject = originalHeadPublicObject;
        r2.publicBaseUrl = originalPublicBaseUrl;
    }
});

test('product scope rejects mismatched category context and keeps one effective image', async () => {
    const originalTransaction = sequelize.transaction;
    const originalFindProductById = scopedCatalogImagesRepository.findProductById;
    const originalDeleteProductImagesByProduct = scopedCatalogImagesRepository.deleteProductImagesByProduct;
    const originalCreateProductImage = scopedCatalogImagesRepository.createProductImage;
    const originalListProductImages = scopedCatalogImagesRepository.listProductImages;
    const originalHeadPublicObject = r2Service.headPublicObject;
    const originalPublicBaseUrl = r2.publicBaseUrl;

    let current = null;

    try {
        sequelize.transaction = async (callback) => callback({ id: 'tx' });
        scopedCatalogImagesRepository.findProductById = async (id) => ({
            id,
            categoryId: 20,
            name: 'Producto',
        });
        scopedCatalogImagesRepository.deleteProductImagesByProduct = async () => {
            current = null;
            return 1;
        };
        scopedCatalogImagesRepository.createProductImage = async (data) => {
            current = {
                id: current ? current.id + 1 : 1,
                ...data,
            };
            return current;
        };
        scopedCatalogImagesRepository.listProductImages = async () => (current ? [current] : []);
        r2Service.headPublicObject = async () => ({
            exists: true,
            status: 200,
            contentType: 'image/webp',
            byteSize: 100,
        });
        r2.publicBaseUrl = 'https://assets.example.com';

        const mismatch = await scopedCatalogImagesService.registerProductImage(30, {
            imageKey: 'products/30/mismatch.webp',
            contentType: 'image/webp',
            byteSize: 100,
        }, {
            categoryId: 99,
        });
        assert.equal(mismatch.error, 'bad_request');
        assert.match(String(mismatch.message || ''), /no pertenece a la categoria/i);

        const first = await scopedCatalogImagesService.registerProductImage(30, {
            imageKey: 'products/30/first.webp',
            contentType: 'image/webp',
            byteSize: 100,
        }, {
            categoryId: 20,
        });
        assert.equal(first.error, undefined);

        const second = await scopedCatalogImagesService.registerProductImage(30, {
            imageKey: 'products/30/second.webp',
            contentType: 'image/webp',
            byteSize: 100,
        }, {
            categoryId: 20,
        });
        assert.equal(second.error, undefined);

        const listed = await scopedCatalogImagesService.listProductImages(30, { categoryId: 20 });
        assert.equal(listed.error, undefined);
        assert.equal(listed.data.length, 1);
        assert.equal(listed.data[0].imageKey, 'products/30/second.webp');
    } finally {
        sequelize.transaction = originalTransaction;
        scopedCatalogImagesRepository.findProductById = originalFindProductById;
        scopedCatalogImagesRepository.deleteProductImagesByProduct = originalDeleteProductImagesByProduct;
        scopedCatalogImagesRepository.createProductImage = originalCreateProductImage;
        scopedCatalogImagesRepository.listProductImages = originalListProductImages;
        r2Service.headPublicObject = originalHeadPublicObject;
        r2.publicBaseUrl = originalPublicBaseUrl;
    }
});
