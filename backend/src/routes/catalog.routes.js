const express = require('express');
const {
    listCategories,
    listProducts,
    listVariants,
    getProductDetail,
    getVariantDetail,
} = require('../controllers/catalog.controller');

const router = express.Router();

router.get('/api/v1/catalog/categories', listCategories);
router.get('/api/v1/catalog/products', listProducts);
router.get('/api/v1/catalog/products/:slug', getProductDetail);
router.get('/api/v1/catalog/variants', listVariants);
router.get('/api/v1/catalog/variants/:sku', getVariantDetail);

module.exports = router;
