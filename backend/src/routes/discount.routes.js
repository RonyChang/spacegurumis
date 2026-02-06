const express = require('express');
const { validateDiscount } = require('../controllers/discount.controller');

const router = express.Router();

router.post('/api/v1/discounts/validate', validateDiscount);

module.exports = router;
