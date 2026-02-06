const express = require('express');
const authRequired = require('../middlewares/authRequired');
const { listOrders, getOrderDetail, createOrder, cancelOrder } = require('../controllers/order.controller');

const router = express.Router();

router.get('/api/v1/orders', authRequired, listOrders);
router.get('/api/v1/orders/:id', authRequired, getOrderDetail);
router.post('/api/v1/orders', authRequired, createOrder);
router.post('/api/v1/orders/:id/cancel', authRequired, cancelOrder);

module.exports = router;
