const express = require('express');
const adminController = require('../controllers/admin.controller');
const productImagesController = require('../controllers/productImages.controller');
const siteAssetsController = require('../controllers/siteAssets.controller');
const authRequired = require('../middlewares/authRequired');
const adminRequired = require('../middlewares/adminRequired');
const csrfRequired = require('../middlewares/csrfRequired');

const router = express.Router();

router.get('/api/v1/admin/orders', authRequired, adminRequired, adminController.listOrders);

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
