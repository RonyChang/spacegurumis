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

    const createCategory = findRoute(adminRoutes, '/api/v1/admin/catalog/categories', 'post');
    assert.ok(createCategory, 'create category route exists');
    const createCategoryNames = routeMiddlewareNames(createCategory);
    assert.ok(createCategoryNames.includes('authRequired'));
    assert.ok(createCategoryNames.includes('adminRequired'));
    assert.ok(createCategoryNames.includes('csrfRequired'));

    const deleteCategory = findRoute(adminRoutes, '/api/v1/admin/catalog/categories/:id', 'delete');
    assert.ok(deleteCategory, 'delete category route exists');
    const deleteCategoryNames = routeMiddlewareNames(deleteCategory);
    assert.ok(deleteCategoryNames.includes('authRequired'));
    assert.ok(deleteCategoryNames.includes('adminRequired'));
    assert.ok(deleteCategoryNames.includes('csrfRequired'));

    const deleteProduct = findRoute(adminRoutes, '/api/v1/admin/catalog/products/:id', 'delete');
    assert.ok(deleteProduct, 'delete product route exists');
    const deleteProductNames = routeMiddlewareNames(deleteProduct);
    assert.ok(deleteProductNames.includes('authRequired'));
    assert.ok(deleteProductNames.includes('adminRequired'));
    assert.ok(deleteProductNames.includes('csrfRequired'));

    const deleteVariant = findRoute(adminRoutes, '/api/v1/admin/catalog/variants/:id', 'delete');
    assert.ok(deleteVariant, 'delete variant route exists');
    const deleteVariantNames = routeMiddlewareNames(deleteVariant);
    assert.ok(deleteVariantNames.includes('authRequired'));
    assert.ok(deleteVariantNames.includes('adminRequired'));
    assert.ok(deleteVariantNames.includes('csrfRequired'));
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

test('adminCatalog.service.createCategory validates payload and maps duplicate slug conflict', async () => {
    const originalCreateCategory = adminCatalogRepository.createCategory;

    try {
        let result = await adminCatalogService.createCategory({ name: '', slug: '' });
        assert.equal(result.error, 'bad_request');

        adminCatalogRepository.createCategory = async () => {
            const error = new Error('duplicate slug');
            error.name = 'SequelizeUniqueConstraintError';
            error.errors = [{ path: 'slug' }];
            throw error;
        };

        result = await adminCatalogService.createCategory({ name: 'Amigurumis', slug: 'amigurumis' });
        assert.equal(result.error, 'conflict');
        assert.equal(result.message, 'Slug ya registrado');
    } finally {
        adminCatalogRepository.createCategory = originalCreateCategory;
    }
});

test('adminCatalog.service.deleteCategory returns not_found when category does not exist', async () => {
    const originalFindCategory = adminCatalogRepository.findCategoryById;

    try {
        adminCatalogRepository.findCategoryById = async () => null;
        const result = await adminCatalogService.deleteCategory(999);
        assert.equal(result.error, 'not_found');
    } finally {
        adminCatalogRepository.findCategoryById = originalFindCategory;
    }
});

test('adminCatalog.service.deleteProduct and deleteVariant return not_found when target does not exist', async () => {
    const originalFindProduct = adminCatalogRepository.findProductById;
    const originalFindVariant = adminCatalogRepository.findVariantById;

    try {
        adminCatalogRepository.findProductById = async () => null;
        adminCatalogRepository.findVariantById = async () => null;

        const productResult = await adminCatalogService.deleteProduct(12345);
        assert.equal(productResult.error, 'not_found');

        const variantResult = await adminCatalogService.deleteVariant(54321);
        assert.equal(variantResult.error, 'not_found');
    } finally {
        adminCatalogRepository.findProductById = originalFindProduct;
        adminCatalogRepository.findVariantById = originalFindVariant;
    }
});

test('adminCatalog.service.deleteProduct and deleteVariant return cleanup counters', async () => {
    const originalTransaction = sequelize.transaction;
    const originalFindProduct = adminCatalogRepository.findProductById;
    const originalFindVariant = adminCatalogRepository.findVariantById;
    const originalDeleteProductScope = adminCatalogRepository.deleteProductScope;
    const originalDeleteVariantScope = adminCatalogRepository.deleteVariantScope;

    try {
        sequelize.transaction = async (callback) => callback({ id: 'tx' });
        adminCatalogRepository.findProductById = async () => ({ id: 10, name: 'Producto X' });
        adminCatalogRepository.findVariantById = async () => ({ id: 20, sku: 'SKU-X' });
        adminCatalogRepository.deleteProductScope = async () => ({
            deletedProducts: 1,
            deletedVariants: 2,
            deletedProductImages: 0,
            deletedVariantImages: 3,
            deletedInventories: 2,
            deletedCartItems: 1,
        });
        adminCatalogRepository.deleteVariantScope = async () => ({
            deletedVariants: 1,
            deletedVariantImages: 2,
            deletedInventories: 1,
            deletedCartItems: 0,
        });

        const productResult = await adminCatalogService.deleteProduct(10);
        assert.equal(productResult.error, undefined);
        assert.equal(productResult.data.deletedProducts, 1);
        assert.equal(productResult.data.deletedVariants, 2);

        const variantResult = await adminCatalogService.deleteVariant(20);
        assert.equal(variantResult.error, undefined);
        assert.equal(variantResult.data.deletedVariants, 1);
        assert.equal(variantResult.data.deletedVariantImages, 2);
    } finally {
        sequelize.transaction = originalTransaction;
        adminCatalogRepository.findProductById = originalFindProduct;
        adminCatalogRepository.findVariantById = originalFindVariant;
        adminCatalogRepository.deleteProductScope = originalDeleteProductScope;
        adminCatalogRepository.deleteVariantScope = originalDeleteVariantScope;
    }
});
