const express = require('express');
const adminController = require('../controllers/admin.controller');
const authRequired = require('../middlewares/authRequired');
const adminRequired = require('../middlewares/adminRequired');

const router = express.Router();

router.get('/api/v1/admin/orders', authRequired, adminRequired, adminController.listOrders);
router.patch(
    '/api/v1/admin/orders/:id/status',
    authRequired,
    adminRequired,
    adminController.updateOrderStatus
);
router.patch(
    '/api/v1/admin/variants/:sku/stock',
    authRequired,
    adminRequired,
    adminController.updateVariantStock
);

module.exports = router;
