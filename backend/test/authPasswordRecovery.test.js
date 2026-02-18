const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const { sequelize } = require('../src/models');
const authService = require('../src/services/auth.service');
const authRepository = require('../src/repositories/auth.repository');
const passwordResetRepository = require('../src/repositories/passwordReset.repository');
const resendClient = require('../src/services/resendClient.service');

test('requestPasswordReset keeps generic response for unknown email', async () => {
    const originalFindUserByEmail = authRepository.findUserByEmail;
    const originalCreateToken = passwordResetRepository.createToken;
    const originalSendEmail = resendClient.sendEmail;

    let createCalls = 0;
    let emailCalls = 0;

    try {
        authRepository.findUserByEmail = async () => null;
        passwordResetRepository.createToken = async () => {
            createCalls += 1;
            return null;
        };
        resendClient.sendEmail = async () => {
            emailCalls += 1;
            return null;
        };

        const result = await authService.requestPasswordReset({ email: 'missing@example.com' });
        assert.deepEqual(result, { accepted: true });
        assert.equal(createCalls, 0);
        assert.equal(emailCalls, 0);
    } finally {
        authRepository.findUserByEmail = originalFindUserByEmail;
        passwordResetRepository.createToken = originalCreateToken;
        resendClient.sendEmail = originalSendEmail;
    }
});

test('requestPasswordReset keeps generic response for existing unverified email without sending mail', async () => {
    const originalFindUserByEmail = authRepository.findUserByEmail;
    const originalCreateToken = passwordResetRepository.createToken;
    const originalSendEmail = resendClient.sendEmail;

    let createCalls = 0;
    let emailCalls = 0;

    try {
        authRepository.findUserByEmail = async () => ({
            id: 12,
            email: 'pending@example.com',
            emailVerifiedAt: null,
        });
        passwordResetRepository.createToken = async () => {
            createCalls += 1;
            return null;
        };
        resendClient.sendEmail = async () => {
            emailCalls += 1;
            return null;
        };

        const result = await authService.requestPasswordReset({ email: 'pending@example.com' });
        assert.deepEqual(result, { accepted: true });
        assert.equal(createCalls, 0);
        assert.equal(emailCalls, 0);
    } finally {
        authRepository.findUserByEmail = originalFindUserByEmail;
        passwordResetRepository.createToken = originalCreateToken;
        resendClient.sendEmail = originalSendEmail;
    }
});

test('requestPasswordReset stores token hash and sends recovery email for eligible user', async () => {
    const originalFindUserByEmail = authRepository.findUserByEmail;
    const originalFindLatestByUserId = passwordResetRepository.findLatestByUserId;
    const originalCreateToken = passwordResetRepository.createToken;
    const originalSendEmail = resendClient.sendEmail;

    let createdPayload = null;
    let sentPayload = null;

    try {
        authRepository.findUserByEmail = async () => ({
            id: 10,
            email: 'user@example.com',
            emailVerifiedAt: new Date(),
        });
        passwordResetRepository.findLatestByUserId = async () => null;
        passwordResetRepository.createToken = async (payload) => {
            createdPayload = payload;
            return { id: 77, ...payload };
        };
        resendClient.sendEmail = async (payload) => {
            sentPayload = payload;
            return { id: 'mail-1' };
        };

        const result = await authService.requestPasswordReset({ email: 'user@example.com' });
        assert.deepEqual(result, { accepted: true });
        assert.ok(createdPayload);
        assert.equal(createdPayload.userId, 10);
        assert.equal(typeof createdPayload.tokenHash, 'string');
        assert.equal(createdPayload.tokenHash.length, 64);
        assert.ok(createdPayload.expiresAt instanceof Date);
        assert.ok(sentPayload);
        assert.equal(sentPayload.to, 'user@example.com');
        assert.match(String(sentPayload.subject), /recuperaci/i);
    } finally {
        authRepository.findUserByEmail = originalFindUserByEmail;
        passwordResetRepository.findLatestByUserId = originalFindLatestByUserId;
        passwordResetRepository.createToken = originalCreateToken;
        resendClient.sendEmail = originalSendEmail;
    }
});

test('requestPasswordReset enforces per-user cooldown without revealing account state', async () => {
    const originalFindUserByEmail = authRepository.findUserByEmail;
    const originalFindLatestByUserId = passwordResetRepository.findLatestByUserId;
    const originalCreateToken = passwordResetRepository.createToken;
    const originalSendEmail = resendClient.sendEmail;

    let createCalls = 0;
    let emailCalls = 0;

    try {
        authRepository.findUserByEmail = async () => ({
            id: 11,
            email: 'cooldown@example.com',
            emailVerifiedAt: new Date(),
        });
        passwordResetRepository.findLatestByUserId = async () => ({
            createdAt: new Date(),
        });
        passwordResetRepository.createToken = async () => {
            createCalls += 1;
            return null;
        };
        resendClient.sendEmail = async () => {
            emailCalls += 1;
            return null;
        };

        const result = await authService.requestPasswordReset({ email: 'cooldown@example.com' });
        assert.deepEqual(result, { accepted: true });
        assert.equal(createCalls, 0);
        assert.equal(emailCalls, 0);
    } finally {
        authRepository.findUserByEmail = originalFindUserByEmail;
        passwordResetRepository.findLatestByUserId = originalFindLatestByUserId;
        passwordResetRepository.createToken = originalCreateToken;
        resendClient.sendEmail = originalSendEmail;
    }
});

test('resetPassword rejects weak replacements', async () => {
    await assert.rejects(
        () => authService.resetPassword({ token: 'x'.repeat(64), newPassword: '123' }),
        /Contraseña mínima de 6 caracteres/
    );
});

test('resetPassword rejects invalid or expired tokens', async () => {
    const originalTransaction = sequelize.transaction;
    const originalFindActiveByTokenHash = passwordResetRepository.findActiveByTokenHash;

    try {
        sequelize.transaction = async (callback) => callback({ LOCK: { UPDATE: 'UPDATE' } });
        passwordResetRepository.findActiveByTokenHash = async () => null;

        await assert.rejects(
            () => authService.resetPassword({ token: 'f'.repeat(64), newPassword: 'secret123' }),
            /Token inválido o expirado/
        );
    } finally {
        sequelize.transaction = originalTransaction;
        passwordResetRepository.findActiveByTokenHash = originalFindActiveByTokenHash;
    }
});

test('resetPassword updates password and invalidates active tokens transactionally', async () => {
    const originalTransaction = sequelize.transaction;
    const originalFindActiveByTokenHash = passwordResetRepository.findActiveByTokenHash;
    const originalUpdateUserPasswordHash = authRepository.updateUserPasswordHash;
    const originalConsumeToken = passwordResetRepository.consumeToken;
    const originalInvalidate = passwordResetRepository.invalidateActiveTokensByUserId;

    const calls = {
        find: 0,
        update: 0,
        consume: 0,
        invalidate: 0,
        passwordHash: '',
    };

    try {
        const tx = { LOCK: { UPDATE: 'UPDATE' } };
        sequelize.transaction = async (callback) => callback(tx);
        passwordResetRepository.findActiveByTokenHash = async () => {
            calls.find += 1;
            return {
                id: 88,
                userId: 22,
            };
        };
        authRepository.updateUserPasswordHash = async (userId, passwordHash) => {
            calls.update += 1;
            calls.passwordHash = passwordHash;
            return { id: userId };
        };
        passwordResetRepository.consumeToken = async () => {
            calls.consume += 1;
            return 1;
        };
        passwordResetRepository.invalidateActiveTokensByUserId = async () => {
            calls.invalidate += 1;
            return 2;
        };

        const result = await authService.resetPassword({
            token: 'a'.repeat(64),
            newPassword: 'newpass123',
        });

        assert.deepEqual(result, { reset: true });
        assert.equal(calls.find, 1);
        assert.equal(calls.update, 1);
        assert.equal(calls.consume, 1);
        assert.equal(calls.invalidate, 1);
        assert.notEqual(calls.passwordHash, 'newpass123');
        assert.ok(calls.passwordHash.length > 20);
    } finally {
        sequelize.transaction = originalTransaction;
        passwordResetRepository.findActiveByTokenHash = originalFindActiveByTokenHash;
        authRepository.updateUserPasswordHash = originalUpdateUserPasswordHash;
        passwordResetRepository.consumeToken = originalConsumeToken;
        passwordResetRepository.invalidateActiveTokensByUserId = originalInvalidate;
    }
});
