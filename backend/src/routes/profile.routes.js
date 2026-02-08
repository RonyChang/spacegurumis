const express = require('express');
const authRequired = require('../middlewares/authRequired');
const csrfRequired = require('../middlewares/csrfRequired');
const { getProfile, updateProfile } = require('../controllers/profile.controller');

const router = express.Router();

router.get('/api/v1/profile', authRequired, getProfile);
router.put('/api/v1/profile', authRequired, csrfRequired, updateProfile);

module.exports = router;
