const express = require('express');
const adminController = require('../controllers/admin.controller');
const adminUsersController = require('../controllers/adminUsers.controller');
const adminCatalogController = require('../controllers/adminCatalog.controller');
const adminDiscountsController = require('../controllers/adminDiscounts.controller');
const productImagesController = require('../controllers/productImages.controller');
const scopedCatalogImagesController = require('../controllers/scopedCatalogImages.controller');
const siteAssetsController = require('../controllers/siteAssets.controller');
const authRequired = require('../middlewares/authRequired');
const adminRequired = require('../middlewares/adminRequired');
const csrfRequired = require('../middlewares/csrfRequired');

const router = express.Router();

router.get('/api/v1/admin/orders', authRequired, adminRequired, adminController.listOrders);

// Admin users
router.get(
    '/api/v1/admin/users',
    authRequired,
    adminRequired,
    adminUsersController.list
);
router.post(
    '/api/v1/admin/users',
    authRequired,
    csrfRequired,
    adminRequired,
    adminUsersController.create
);
router.delete(
    '/api/v1/admin/users/:id',
    authRequired,
    csrfRequired,
    adminRequired,
    adminUsersController.remove
);

// Admin catalog
router.get(
    '/api/v1/admin/catalog/categories',
    authRequired,
    adminRequired,
    adminCatalogController.listCategories
);
router.post(
    '/api/v1/admin/catalog/categories',
    authRequired,
    csrfRequired,
    adminRequired,
    adminCatalogController.createCategory
);
router.patch(
    '/api/v1/admin/catalog/categories/:id',
    authRequired,
    csrfRequired,
    adminRequired,
    adminCatalogController.updateCategory
);
router.delete(
    '/api/v1/admin/catalog/categories/:id',
    authRequired,
    csrfRequired,
    adminRequired,
    adminCatalogController.deleteCategory
);
router.get(
    '/api/v1/admin/catalog/products',
    authRequired,
    adminRequired,
    adminCatalogController.listProducts
);
router.post(
    '/api/v1/admin/catalog/products',
    authRequired,
    csrfRequired,
    adminRequired,
    adminCatalogController.createProduct
);
router.patch(
    '/api/v1/admin/catalog/products/:id',
    authRequired,
    csrfRequired,
    adminRequired,
    adminCatalogController.updateProduct
);
router.delete(
    '/api/v1/admin/catalog/products/:id',
    authRequired,
    csrfRequired,
    adminRequired,
    adminCatalogController.deleteProduct
);
router.post(
    '/api/v1/admin/catalog/products/:id/variants',
    authRequired,
    csrfRequired,
    adminRequired,
    adminCatalogController.createVariant
);
router.patch(
    '/api/v1/admin/catalog/variants/:id',
    authRequired,
    csrfRequired,
    adminRequired,
    adminCatalogController.updateVariant
);
router.patch(
    '/api/v1/admin/catalog/variants/:id/stock',
    authRequired,
    csrfRequired,
    adminRequired,
    adminCatalogController.updateVariantStock
);
router.delete(
    '/api/v1/admin/catalog/variants/:id',
    authRequired,
    csrfRequired,
    adminRequired,
    adminCatalogController.deleteVariant
);

// Admin discounts
router.get(
    '/api/v1/admin/discounts',
    authRequired,
    adminRequired,
    adminDiscountsController.list
);
router.post(
    '/api/v1/admin/discounts',
    authRequired,
    csrfRequired,
    adminRequired,
    adminDiscountsController.create
);
router.patch(
    '/api/v1/admin/discounts/:id',
    authRequired,
    csrfRequired,
    adminRequired,
    adminDiscountsController.update
);
router.delete(
    '/api/v1/admin/discounts/:id',
    authRequired,
    csrfRequired,
    adminRequired,
    adminDiscountsController.remove
);

// Product images (R2)
router.post(
    '/api/v1/admin/variants/:id/images/presign',
    authRequired,
    csrfRequired,
    adminRequired,
    productImagesController.presign
);
router.post(
    '/api/v1/admin/variants/:id/images',
    authRequired,
    csrfRequired,
    adminRequired,
    productImagesController.register
);
router.get(
    '/api/v1/admin/variants/:id/images',
    authRequired,
    adminRequired,
    productImagesController.list
);
router.patch(
    '/api/v1/admin/variants/:id/images/:imageId',
    authRequired,
    csrfRequired,
    adminRequired,
    productImagesController.update
);
router.delete(
    '/api/v1/admin/variants/:id/images/:imageId',
    authRequired,
    csrfRequired,
    adminRequired,
    productImagesController.remove
);

// Category images (single image scope)
router.post(
    '/api/v1/admin/categories/:id/images/presign',
    authRequired,
    csrfRequired,
    adminRequired,
    scopedCatalogImagesController.categoryPresign
);
router.post(
    '/api/v1/admin/categories/:id/images',
    authRequired,
    csrfRequired,
    adminRequired,
    scopedCatalogImagesController.categoryRegister
);
router.get(
    '/api/v1/admin/categories/:id/images',
    authRequired,
    adminRequired,
    scopedCatalogImagesController.categoryList
);
router.patch(
    '/api/v1/admin/categories/:id/images/:imageId',
    authRequired,
    csrfRequired,
    adminRequired,
    scopedCatalogImagesController.categoryUpdate
);
router.delete(
    '/api/v1/admin/categories/:id/images/:imageId',
    authRequired,
    csrfRequired,
    adminRequired,
    scopedCatalogImagesController.categoryRemove
);

// Product images (single image scope)
router.post(
    '/api/v1/admin/products/:id/images/presign',
    authRequired,
    csrfRequired,
    adminRequired,
    scopedCatalogImagesController.productPresign
);
router.post(
    '/api/v1/admin/products/:id/images',
    authRequired,
    csrfRequired,
    adminRequired,
    scopedCatalogImagesController.productRegister
);
router.get(
    '/api/v1/admin/products/:id/images',
    authRequired,
    adminRequired,
    scopedCatalogImagesController.productList
);
router.patch(
    '/api/v1/admin/products/:id/images/:imageId',
    authRequired,
    csrfRequired,
    adminRequired,
    scopedCatalogImagesController.productUpdate
);
router.delete(
    '/api/v1/admin/products/:id/images/:imageId',
    authRequired,
    csrfRequired,
    adminRequired,
    scopedCatalogImagesController.productRemove
);

// Site decorative assets (R2)
router.post(
    '/api/v1/admin/site-assets/presign',
    authRequired,
    csrfRequired,
    adminRequired,
    siteAssetsController.presign
);
router.post(
    '/api/v1/admin/site-assets',
    authRequired,
    csrfRequired,
    adminRequired,
    siteAssetsController.register
);
router.get(
    '/api/v1/admin/site-assets',
    authRequired,
    adminRequired,
    siteAssetsController.list
);
router.patch(
    '/api/v1/admin/site-assets/:id',
    authRequired,
    csrfRequired,
    adminRequired,
    siteAssetsController.update
);
router.delete(
    '/api/v1/admin/site-assets/:id',
    authRequired,
    csrfRequired,
    adminRequired,
    siteAssetsController.remove
);
router.patch(
    '/api/v1/admin/orders/:id/status',
    authRequired,
    csrfRequired,
    adminRequired,
    adminController.updateOrderStatus
);
router.patch(
    '/api/v1/admin/variants/:sku/stock',
    authRequired,
    csrfRequired,
    adminRequired,
    adminController.updateVariantStock
);

module.exports = router;
