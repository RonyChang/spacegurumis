const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const { integrations, frontendBaseUrl } = require('../config');
const { sequelize } = require('../models');
const security = require('../config/security');
const authRepository = require('../repositories/auth.repository');
const passwordResetRepository = require('../repositories/passwordReset.repository');
const adminTwoFactorService = require('./adminTwoFactor.service');
const emailVerificationService = require('./emailVerification.service');
const { buildPasswordResetEmailText } = require('./passwordResetEmail.service');
const resendClient = require('./resendClient.service');

function createError(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
}

function normalizeEmail(email) {
    return email.trim().toLowerCase();
}

function normalizeName(value) {
    return value.trim();
}

function isStrongEnoughPassword(password) {
    return typeof password === 'string' && password.trim().length >= 6;
}

function normalizeOptionalName(value, fallback) {
    if (typeof value !== 'string' || !value.trim()) {
        return fallback;
    }

    return value.trim();
}

function buildUserResponse(user) {
    return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl || null,
        role: user.role,
    };
}

function hashPasswordResetToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function buildPasswordResetLink(rawToken) {
    if (!frontendBaseUrl) {
        return null;
    }

    const path = security.passwordReset && security.passwordReset.urlPath
        ? security.passwordReset.urlPath
        : '/reset-password';
    const url = new URL(path, frontendBaseUrl);
    url.searchParams.set('token', rawToken);
    return url.toString();
}

function getGoogleConfig() {
    const { clientId, clientSecret, callbackUrl } = integrations.googleOAuth;

    if (!clientId || !clientSecret || !callbackUrl) {
        throw createError(500, 'Google OAuth no configurado');
    }

    return { clientId, clientSecret, callbackUrl };
}

function buildGoogleAuthUrl() {
    const { clientId, callbackUrl } = getGoogleConfig();
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: callbackUrl,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'offline',
        prompt: 'consent',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function exchangeGoogleCode(code) {
    const { clientId, clientSecret, callbackUrl } = getGoogleConfig();
    const params = new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code',
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
    });

    if (!response.ok) {
        throw createError(401, 'No se pudo validar con Google');
    }

    return response.json();
}

async function fetchGoogleProfile(accessToken) {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        throw createError(401, 'No se pudo obtener perfil de Google');
    }

    return response.json();
}

function buildNamesFromGoogleProfile(profile) {
    const firstName = (profile.given_name || '').trim();
    const lastName = (profile.family_name || '').trim();

    if (firstName || lastName) {
        return {
            firstName: firstName || 'Usuario',
            lastName: lastName || 'Google',
        };
    }

    const fullName = (profile.name || '').trim();
    if (!fullName) {
        return { firstName: 'Usuario', lastName: 'Google' };
    }

    const parts = fullName.split(' ').filter(Boolean);
    const derivedFirst = parts[0] || 'Usuario';
    const derivedLast = parts.slice(1).join(' ').trim() || 'Google';
    return { firstName: derivedFirst, lastName: derivedLast };
}

async function registerUser({ email, firstName, lastName, password }) {
    const normalizedEmail = normalizeEmail(email);
    const existing = await authRepository.findUserByEmail(normalizedEmail);
    if (existing) {
        if (existing.emailVerifiedAt) {
            throw createError(409, 'El correo ya esta registrado');
        }

        await emailVerificationService.sendVerificationCode(existing);
        return {
            verificationRequired: true,
            resent: true,
            email: existing.email,
        };
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const safeFirstName = normalizeOptionalName(firstName, '');
    const safeLastName = normalizeOptionalName(lastName, '');
    const newUser = await authRepository.createUser({
        email: normalizedEmail,
        firstName: safeFirstName,
        lastName: safeLastName,
        passwordHash,
        role: 'customer',
        googleId: null,
        avatarUrl: null,
        emailVerifiedAt: null,
    });

    await emailVerificationService.sendVerificationCode(newUser);
    return {
        verificationRequired: true,
        resent: false,
        email: newUser.email,
    };
}

async function loginUser({ email, password }) {
    const normalizedEmail = normalizeEmail(email);
    const user = await authRepository.findUserByEmail(normalizedEmail);
    if (!user) {
        throw createError(401, 'Credenciales invalidas');
    }

    if (!user.passwordHash) {
        throw createError(401, 'Credenciales invalidas');
    }

    if (!user.emailVerifiedAt) {
        throw createError(403, 'Email no verificado');
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
        throw createError(401, 'Credenciales invalidas');
    }

    if (user.role === 'admin') {
        await adminTwoFactorService.sendChallenge(user);
        return {
            twoFactorRequired: true,
            email: user.email,
        };
    }

    return {
        user: buildUserResponse(user),
    };
}

async function loginWithGoogle(code) {
    const tokens = await exchangeGoogleCode(code);
    const accessToken = tokens.access_token;
    if (!accessToken) {
        throw createError(401, 'Token de Google inválido');
    }

    const profile = await fetchGoogleProfile(accessToken);
    const email = profile.email ? normalizeEmail(profile.email) : '';
    const googleId = profile.sub || '';

    if (!email || !googleId) {
        throw createError(400, 'Datos de Google incompletos');
    }

    const avatarUrl = profile.picture || null;
    let user = await authRepository.findUserByGoogleId(googleId);

    if (!user) {
        const existing = await authRepository.findUserByEmail(email);
        if (existing && existing.googleId && existing.googleId !== googleId) {
            throw createError(409, 'El correo ya está vinculado a otra cuenta Google');
        }

        if (existing) {
            user = await authRepository.linkGoogleAccount({
                userId: existing.id,
                googleId,
                avatarUrl,
            });
            if (user && !user.emailVerifiedAt) {
                user = await authRepository.updateUserEmailVerifiedAt(user.id, new Date());
            }
        } else {
            const names = buildNamesFromGoogleProfile(profile);
            user = await authRepository.createUser({
                email,
                firstName: normalizeName(names.firstName),
                lastName: normalizeName(names.lastName),
                passwordHash: null,
                role: 'customer',
                googleId,
                avatarUrl,
                emailVerifiedAt: new Date(),
            });
        }
    }

    if (user && !user.emailVerifiedAt) {
        user = await authRepository.updateUserEmailVerifiedAt(user.id, new Date());
    }

    return {
        user: buildUserResponse(user),
    };
}

async function requestPasswordReset({ email }) {
    const normalizedEmail = normalizeEmail(email);
    const genericResponse = { accepted: true };
    const user = await authRepository.findUserByEmail(normalizedEmail);
    if (!user || !user.emailVerifiedAt) {
        return genericResponse;
    }

    const latest = await passwordResetRepository.findLatestByUserId(user.id);
    if (latest) {
        const createdAt = new Date(latest.createdAt || latest.created_at);
        if (!Number.isNaN(createdAt.getTime())) {
            const cooldownMs = security.passwordReset.requestCooldownSeconds * 1000;
            if ((Date.now() - createdAt.getTime()) < cooldownMs) {
                return genericResponse;
            }
        }
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashPasswordResetToken(token);
    const expiresAt = new Date(Date.now() + security.passwordReset.ttlMinutes * 60 * 1000);

    await passwordResetRepository.createToken({
        userId: user.id,
        tokenHash,
        expiresAt,
    });

    const resetLink = buildPasswordResetLink(token);
    const ttlMinutes = security.passwordReset.ttlMinutes;
    const plainTextBody = buildPasswordResetEmailText({
        resetLink,
        token,
        ttlMinutes,
    });

    try {
        await resendClient.sendEmail({
            to: user.email,
            subject: 'Recuperación de contraseña',
            text: plainTextBody,
        });
    } catch (error) {
        // El endpoint forgot debe permanecer no enumerativo aun si el proveedor de correo falla.
        console.error('Password reset email error:', error && error.message ? error.message : error);
    }

    return genericResponse;
}

async function resetPassword({ token, newPassword }) {
    if (!isStrongEnoughPassword(newPassword)) {
        throw createError(400, 'Contraseña mínima de 6 caracteres');
    }

    const tokenHash = hashPasswordResetToken(token);
    const now = new Date();

    return sequelize.transaction(async (transaction) => {
        const activeToken = await passwordResetRepository.findActiveByTokenHash(tokenHash, {
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
        if (!activeToken) {
            throw createError(400, 'Token inválido o expirado');
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        const updatedUser = await authRepository.updateUserPasswordHash(
            activeToken.userId,
            passwordHash,
            { transaction }
        );
        if (!updatedUser) {
            throw createError(404, 'Usuario no encontrado');
        }

        const consumed = await passwordResetRepository.consumeToken(activeToken.id, now, { transaction });
        if (!consumed) {
            throw createError(400, 'Token inválido o expirado');
        }

        await passwordResetRepository.invalidateActiveTokensByUserId(activeToken.userId, now, {
            transaction,
            excludeId: activeToken.id,
        });

        return { reset: true };
    });
}

async function verifyAdminTwoFactor({ email, code }) {
    const normalizedEmail = normalizeEmail(email);
    const user = await authRepository.findUserByEmail(normalizedEmail);
    if (!user) {
        throw createError(404, 'Email no registrado');
    }

    if (user.role !== 'admin') {
        throw createError(403, 'Acceso no autorizado');
    }

    if (!user.emailVerifiedAt) {
        throw createError(403, 'Email no verificado');
    }

    const result = await adminTwoFactorService.verifyChallenge(user, code);
    if (!result.ok) {
        if (result.reason === 'locked') {
            const error = new Error('Demasiados intentos. Intenta mas tarde.');
            error.status = 423;
            throw error;
        }

        const message = result.reason === 'expired'
            ? 'Codigo expirado'
            : result.reason === 'missing'
                ? 'Codigo no solicitado'
                : 'Codigo invalido';
        throw createError(400, message);
    }

    return {
        user: buildUserResponse(user),
    };
}

async function resendVerification({ email }) {
    const normalizedEmail = normalizeEmail(email);
    const user = await authRepository.findUserByEmail(normalizedEmail);
    if (!user) {
        throw createError(404, 'Email no registrado');
    }

    if (user.emailVerifiedAt) {
        throw createError(409, 'Email ya verificado');
    }

    await emailVerificationService.sendVerificationCode(user);
    return { sent: true };
}

async function verifyEmail({ email, code }) {
    const normalizedEmail = normalizeEmail(email);
    const user = await authRepository.findUserByEmail(normalizedEmail);
    if (!user) {
        throw createError(404, 'Email no registrado');
    }

    if (user.emailVerifiedAt) {
        return {
            user: buildUserResponse(user),
        };
    }

    const result = await emailVerificationService.verifyCode(user.id, code);
    if (!result.ok) {
        const message = result.reason === 'expired'
            ? 'Codigo expirado'
            : 'Codigo invalido';
        throw createError(400, message);
    }

    const updated = await authRepository.updateUserEmailVerifiedAt(user.id, new Date());
    return {
        user: buildUserResponse(updated || user),
    };
}

module.exports = {
    registerUser,
    loginUser,
    buildGoogleAuthUrl,
    loginWithGoogle,
    verifyAdminTwoFactor,
    resendVerification,
    verifyEmail,
    requestPasswordReset,
    resetPassword,
};




