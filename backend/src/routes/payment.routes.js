const express = require('express');
const authRequired = require('../middlewares/authRequired');
const paymentController = require('../controllers/payment.controller');

const router = express.Router();

router.post('/api/v1/payments/stripe/session', authRequired, paymentController.createStripeSession);

module.exports = router;
