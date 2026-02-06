const bcrypt = require('bcryptjs');
const authRepository = require('../repositories/auth.repository');

function normalizeEmail(value) {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function parseAdminEmails(raw) {
    if (!raw) {
        return [];
    }

    return raw
        .split(',')
        .map(normalizeEmail)
        .filter(Boolean);
}

async function bootstrapAdmins() {
    const emails = parseAdminEmails(process.env.ADMIN_EMAILS || '');
    if (!emails.length) {
        return { total: 0, promoted: 0, created: 0, skipped: 0 };
    }

    const bootstrapPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD || '';
    let promoted = 0;
    let created = 0;
    let skipped = 0;

    for (const email of emails) {
        const existing = await authRepository.findUserByEmail(email);
        if (existing) {
            if (existing.role !== 'admin') {
                await authRepository.updateUserRole(existing.id, 'admin');
                promoted += 1;
            }
            if (!existing.emailVerifiedAt) {
                await authRepository.updateUserEmailVerifiedAt(existing.id, new Date());
            }
            continue;
        }

        if (!bootstrapPassword) {
            console.warn(`Admin bootstrap omitido para ${email}: falta ADMIN_BOOTSTRAP_PASSWORD.`);
            skipped += 1;
            continue;
        }

        const passwordHash = await bcrypt.hash(bootstrapPassword, 10);
        await authRepository.createUser({
            email,
            firstName: 'Admin',
            lastName: 'Spacegurumis',
            passwordHash,
            role: 'admin',
            googleId: null,
            avatarUrl: null,
            emailVerifiedAt: new Date(),
        });
        created += 1;
    }

    return { total: emails.length, promoted, created, skipped };
}

module.exports = {
    bootstrapAdmins,
};
