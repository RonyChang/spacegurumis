const express = require('express');
const authRequired = require('../middlewares/authRequired');
const csrfRequired = require('../middlewares/csrfRequired');
const { listOrders, getOrderDetail, createOrder, cancelOrder } = require('../controllers/order.controller');

const router = express.Router();

router.get('/api/v1/orders', authRequired, listOrders);
router.get('/api/v1/orders/:id', authRequired, getOrderDetail);
router.post('/api/v1/orders', authRequired, csrfRequired, createOrder);
router.post('/api/v1/orders/:id/cancel', authRequired, csrfRequired, cancelOrder);

module.exports = router;
