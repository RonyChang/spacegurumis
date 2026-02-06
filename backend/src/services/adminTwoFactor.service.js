const bcrypt = require('bcryptjs');

const adminTwoFactorRepository = require('../repositories/adminTwoFactor.repository');
const resendClient = require('./resendClient.service');

function getTtlMinutes() {
    const raw = Number(process.env.ADMIN_2FA_TTL_MINUTES);
    if (Number.isFinite(raw) && raw > 0) {
        return Math.floor(raw);
    }

    return 10;
}

function getMaxAttempts() {
    const raw = Number(process.env.ADMIN_2FA_MAX_ATTEMPTS);
    if (Number.isFinite(raw) && raw > 0) {
        return Math.floor(raw);
    }

    return 5;
}

function getLockMinutes() {
    const raw = Number(process.env.ADMIN_2FA_LOCK_MINUTES);
    if (Number.isFinite(raw) && raw > 0) {
        return Math.floor(raw);
    }

    return 15;
}

function generateCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

function parseDate(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
}

async function sendChallenge(user) {
    if (!user || !user.id || !user.email) {
        const error = new Error('Usuario invalido para 2FA');
        error.status = 500;
        throw error;
    }

    const existing = await adminTwoFactorRepository.findChallengeByUserId(user.id);
    if (existing) {
        const lockedUntil = parseDate(existing.lockedUntil);
        if (lockedUntil && lockedUntil > new Date()) {
            const error = new Error('Demasiados intentos. Intenta mas tarde.');
            error.status = 423;
            throw error;
        }
    }

    const ttlMinutes = getTtlMinutes();
    const code = generateCode();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    await adminTwoFactorRepository.saveChallenge({
        userId: user.id,
        codeHash,
        expiresAt,
    });

    try {
        await resendClient.sendEmail({
            to: user.email,
            subject: 'Codigo 2FA de administrador',
            text: `Tu codigo 2FA es ${code}. Expira en ${ttlMinutes} minutos.`,
        });
    } catch (error) {
        error.status = error.status || 500;
        throw error;
    }
}

async function verifyChallenge(user, code) {
    if (!user || !user.id || !code) {
        return { ok: false, reason: 'invalid' };
    }

    const record = await adminTwoFactorRepository.findChallengeByUserId(user.id);
    if (!record) {
        return { ok: false, reason: 'missing' };
    }

    const lockedUntil = parseDate(record.lockedUntil);
    if (lockedUntil && lockedUntil > new Date()) {
        return { ok: false, reason: 'locked', lockedUntil };
    }

    const expiresAt = parseDate(record.expiresAt);
    if (!expiresAt || expiresAt <= new Date()) {
        await adminTwoFactorRepository.clearChallenge(user.id);
        return { ok: false, reason: 'expired' };
    }

    const matches = await bcrypt.compare(code, record.codeHash);
    if (!matches) {
        const updated = await adminTwoFactorRepository.incrementAttempts(user.id);
        const attempts = updated ? updated.attempts : record.attempts + 1;
        const maxAttempts = getMaxAttempts();
        if (attempts >= maxAttempts) {
            const lockedUntilValue = new Date(Date.now() + getLockMinutes() * 60 * 1000);
            await adminTwoFactorRepository.setLockedUntil(user.id, lockedUntilValue);
            return { ok: false, reason: 'locked', lockedUntil: lockedUntilValue };
        }

        return { ok: false, reason: 'invalid' };
    }

    await adminTwoFactorRepository.clearChallenge(user.id);
    return { ok: true };
}

module.exports = {
    sendChallenge,
    verifyChallenge,
};
