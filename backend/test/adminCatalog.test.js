const test = require('node:test');
const assert = require('node:assert/strict');

const adminRoutes = require('../src/routes/admin.routes');
const adminCatalogService = require('../src/services/adminCatalog.service');
const adminCatalogRepository = require('../src/repositories/adminCatalog.repository');
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

test('admin catalog routes include auth/admin and csrf on mutating endpoints', () => {
    const listProducts = findRoute(adminRoutes, '/api/v1/admin/catalog/products', 'get');
    assert.ok(listProducts, 'list products route exists');
    const listProductsNames = routeMiddlewareNames(listProducts);
    assert.ok(listProductsNames.includes('authRequired'));
    assert.ok(listProductsNames.includes('adminRequired'));
    assert.equal(listProductsNames.includes('csrfRequired'), false);

    const createProduct = findRoute(adminRoutes, '/api/v1/admin/catalog/products', 'post');
    assert.ok(createProduct, 'create product route exists');
    const createNames = routeMiddlewareNames(createProduct);
    assert.ok(createNames.includes('authRequired'));
    assert.ok(createNames.includes('adminRequired'));
    assert.ok(createNames.includes('csrfRequired'));

    const updateVariantStock = findRoute(adminRoutes, '/api/v1/admin/catalog/variants/:id/stock', 'patch');
    assert.ok(updateVariantStock, 'variant stock route exists');
    const stockNames = routeMiddlewareNames(updateVariantStock);
    assert.ok(stockNames.includes('authRequired'));
    assert.ok(stockNames.includes('adminRequired'));
    assert.ok(stockNames.includes('csrfRequired'));
});

test('adminCatalog.service.createProduct creates product + variant + inventory transactionally', async () => {
    const originalTransaction = sequelize.transaction;
    const originalFindCategory = adminCatalogRepository.findCategoryById;
    const originalCreateProduct = adminCatalogRepository.createProduct;
    const originalCreateVariant = adminCatalogRepository.createVariant;
    const originalCreateInventory = adminCatalogRepository.createInventory;

    const calls = [];

    try {
        sequelize.transaction = async (callback) => callback({ id: 'tx' });
        adminCatalogRepository.findCategoryById = async () => ({ id: 9, name: 'Peluche' });
        adminCatalogRepository.createProduct = async (payload) => {
            calls.push('product');
            return { id: 10, ...payload };
        };
        adminCatalogRepository.createVariant = async (payload) => {
            calls.push('variant');
            return { id: 20, ...payload };
        };
        adminCatalogRepository.createInventory = async (payload) => {
            calls.push('inventory');
            return { id: 30, ...payload };
        };

        const result = await adminCatalogService.createProduct({
            categoryId: 9,
            name: 'Amigurumi',
            slug: 'amigurumi',
            description: 'desc',
            sku: 'SKU-1',
            variantName: 'Rojo',
            price: 49.9,
            initialStock: 8,
        });

        assert.equal(result.error, undefined);
        assert.deepEqual(calls, ['product', 'variant', 'inventory']);
        assert.equal(result.data.product.slug, 'amigurumi');
        assert.equal(result.data.variant.sku, 'SKU-1');
        assert.equal(result.data.inventory.stock, 8);
    } finally {
        sequelize.transaction = originalTransaction;
        adminCatalogRepository.findCategoryById = originalFindCategory;
        adminCatalogRepository.createProduct = originalCreateProduct;
        adminCatalogRepository.createVariant = originalCreateVariant;
        adminCatalogRepository.createInventory = originalCreateInventory;
    }
});

test('adminCatalog.service.createProduct maps duplicate slug conflict and aborts variant creation', async () => {
    const originalTransaction = sequelize.transaction;
    const originalCreateProduct = adminCatalogRepository.createProduct;
    const originalCreateVariant = adminCatalogRepository.createVariant;
    const originalCreateInventory = adminCatalogRepository.createInventory;

    let rolledBack = false;
    let variantCalls = 0;
    let inventoryCalls = 0;

    try {
        sequelize.transaction = async (callback) => {
            try {
                return await callback({ id: 'tx' });
            } catch (error) {
                rolledBack = true;
                throw error;
            }
        };

        adminCatalogRepository.createProduct = async () => {
            const error = new Error('duplicate slug');
            error.name = 'SequelizeUniqueConstraintError';
            error.errors = [{ path: 'slug' }];
            throw error;
        };
        adminCatalogRepository.createVariant = async () => {
            variantCalls += 1;
            return null;
        };
        adminCatalogRepository.createInventory = async () => {
            inventoryCalls += 1;
            return null;
        };

        const result = await adminCatalogService.createProduct({
            name: 'Amigurumi',
            slug: 'amigurumi',
            sku: 'SKU-1',
            price: 49.9,
            initialStock: 8,
        });

        assert.equal(result.error, 'conflict');
        assert.equal(result.message, 'Slug ya registrado');
        assert.equal(rolledBack, true);
        assert.equal(variantCalls, 0);
        assert.equal(inventoryCalls, 0);
    } finally {
        sequelize.transaction = originalTransaction;
        adminCatalogRepository.createProduct = originalCreateProduct;
        adminCatalogRepository.createVariant = originalCreateVariant;
        adminCatalogRepository.createInventory = originalCreateInventory;
    }
});

