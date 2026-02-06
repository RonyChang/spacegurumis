const express = require('express');
const stripeWebhookController = require('../controllers/stripeWebhook.controller');

const router = express.Router();

router.post('/', stripeWebhookController.handleStripeWebhook);

module.exports = router;
