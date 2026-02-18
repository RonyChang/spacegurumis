const express = require('express');
const security = require('../config/security');
const { createRateLimiter } = require('../middlewares/rateLimit');
const {
    register,
    login,
    verifyEmail,
    verifyAdminTwoFactor,
    resendVerification,
    forgotPassword,
    resetPassword,
    googleStart,
    googleCallback,
    logout,
    refresh,
} = require('../controllers/auth.controller');

const router = express.Router();

const registerLimiter = createRateLimiter({
    windowMs: security.rateLimit.windowMs,
    max: security.rateLimit.registerMax,
    keyPrefix: 'auth:register',
});
const loginLimiter = createRateLimiter({
    windowMs: security.rateLimit.windowMs,
    max: security.rateLimit.loginMax,
    keyPrefix: 'auth:login',
});
const verifyEmailLimiter = createRateLimiter({
    windowMs: security.rateLimit.windowMs,
    max: security.rateLimit.verifyEmailMax,
    keyPrefix: 'auth:verify-email',
});
const resendLimiter = createRateLimiter({
    windowMs: security.rateLimit.windowMs,
    max: security.rateLimit.resendMax,
    keyPrefix: 'auth:resend',
});
const admin2faLimiter = createRateLimiter({
    windowMs: security.rateLimit.windowMs,
    max: security.rateLimit.admin2faMax,
    keyPrefix: 'auth:admin-2fa',
});
const refreshLimiter = createRateLimiter({
    windowMs: security.rateLimit.windowMs,
    max: security.rateLimit.refreshMax,
    keyPrefix: 'auth:refresh',
});
const forgotPasswordLimiter = createRateLimiter({
    windowMs: security.rateLimit.windowMs,
    max: security.rateLimit.forgotPasswordMax,
    keyPrefix: 'auth:forgot-password',
});
const resetPasswordLimiter = createRateLimiter({
    windowMs: security.rateLimit.windowMs,
    max: security.rateLimit.resetPasswordMax,
    keyPrefix: 'auth:reset-password',
});

router.post('/api/v1/auth/register', registerLimiter, register);
router.post('/api/v1/auth/login', loginLimiter, login);
router.post('/api/v1/auth/verify-email', verifyEmailLimiter, verifyEmail);
router.post('/api/v1/auth/resend-verification', resendLimiter, resendVerification);
router.post('/api/v1/auth/password/forgot', forgotPasswordLimiter, forgotPassword);
router.post('/api/v1/auth/password/reset', resetPasswordLimiter, resetPassword);
router.post('/api/v1/auth/admin/verify-2fa', admin2faLimiter, verifyAdminTwoFactor);
router.get('/api/v1/auth/google', googleStart);
router.get('/api/v1/auth/google/callback', googleCallback);
router.post('/api/v1/auth/logout', logout);
router.post('/api/v1/auth/refresh', refreshLimiter, refresh);

module.exports = router;
