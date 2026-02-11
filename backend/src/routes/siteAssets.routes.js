const express = require('express');
const siteAssetsController = require('../controllers/siteAssets.controller');

const router = express.Router();

router.get('/api/v1/site-assets/:slot', siteAssetsController.listBySlot);

module.exports = router;
