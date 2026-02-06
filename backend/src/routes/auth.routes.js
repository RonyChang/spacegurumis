const express = require('express');
const {
    register,
    login,
    verifyEmail,
    verifyAdminTwoFactor,
    resendVerification,
    googleStart,
    googleCallback,
} = require('../controllers/auth.controller');

const router = express.Router();

router.post('/api/v1/auth/register', register);
router.post('/api/v1/auth/login', login);
router.post('/api/v1/auth/verify-email', verifyEmail);
router.post('/api/v1/auth/resend-verification', resendVerification);
router.post('/api/v1/auth/admin/verify-2fa', verifyAdminTwoFactor);
router.get('/api/v1/auth/google', googleStart);
router.get('/api/v1/auth/google/callback', googleCallback);

module.exports = router;
