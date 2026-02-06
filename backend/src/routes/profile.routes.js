const express = require('express');
const authRequired = require('../middlewares/authRequired');
const { getProfile, updateProfile } = require('../controllers/profile.controller');

const router = express.Router();

router.get('/api/v1/profile', authRequired, getProfile);
router.put('/api/v1/profile', authRequired, updateProfile);

module.exports = router;
