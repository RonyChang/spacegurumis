const bcrypt = require('bcryptjs');

const emailVerificationRepository = require('../repositories/emailVerification.repository');
const resendClient = require('./resendClient.service');

function getVerificationTtlMinutes() {
    const raw = Number(process.env.EMAIL_VERIFICATION_TTL_MINUTES);
    if (Number.isFinite(raw) && raw > 0) {
        return Math.floor(raw);
    }

    return 10;
}

function generateCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendVerificationCode(user) {
    if (!user || !user.id || !user.email) {
        const error = new Error('Usuario invalido para verificacion');
        error.status = 500;
        throw error;
    }

    const latest = await emailVerificationRepository.findLatestByUserId(user.id);
    if (latest) {
        const lastSentAt = new Date(latest.createdAt || latest.created_at);
        if (!Number.isNaN(lastSentAt.getTime())) {
            const elapsedMs = Date.now() - lastSentAt.getTime();
            if (elapsedMs < 60000) {
                const error = new Error('Espera 60 segundos para reenviar el codigo.');
                error.status = 429;
                throw error;
            }
        }
    }

    const ttlMinutes = getVerificationTtlMinutes();
    const code = generateCode();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    await emailVerificationRepository.deleteByUserId(user.id);
    await emailVerificationRepository.createVerification({
        userId: user.id,
        codeHash,
        expiresAt,
    });

    try {
        await resendClient.sendEmail({
            to: user.email,
            subject: 'Codigo de verificacion',
            text: `Tu codigo de verificacion es ${code}. Expira en ${ttlMinutes} minutos.`,
        });
    } catch (error) {
        error.status = error.status || 500;
        throw error;
    }

    return { expiresAt };
}

async function verifyCode(userId, code) {
    if (!userId || !code) {
        return { ok: false, reason: 'invalid' };
    }

    const latest = await emailVerificationRepository.findLatestByUserId(userId);
    if (!latest) {
        return { ok: false, reason: 'missing' };
    }

    const now = new Date();
    const expiresAt = new Date(latest.expiresAt);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt <= now) {
        return { ok: false, reason: 'expired' };
    }

    const matches = await bcrypt.compare(code, latest.codeHash);
    if (!matches) {
        return { ok: false, reason: 'invalid' };
    }

    await emailVerificationRepository.deleteByUserId(userId);
    return { ok: true };
}

module.exports = {
    sendVerificationCode,
    verifyCode,
};
