const bcrypt = require('bcryptjs');
const adminUsersRepository = require('../repositories/adminUsers.repository');

function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

function normalizeName(value) {
    return String(value || '').trim();
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function isStrongEnoughPassword(password) {
    const text = String(password || '');
    return text.length >= 8;
}

function buildUserResponse(user) {
    return {
        id: user.id,
        email: user.email,
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        role: user.role,
        isActive: Boolean(user.isActive),
        emailVerifiedAt: user.emailVerifiedAt || null,
        createdAt: user.createdAt || user.created_at || null,
        updatedAt: user.updatedAt || user.updated_at || null,
    };
}

async function listAdminUsers() {
    const rows = await adminUsersRepository.listAdminUsers();
    return {
        data: rows.map(buildUserResponse),
    };
}

async function createOrPromoteAdmin(payload) {
    const email = normalizeEmail(payload && payload.email);
    if (!email || !isValidEmail(email)) {
        return { error: 'bad_request', message: 'Email invalido' };
    }

    const existing = await adminUsersRepository.findUserByEmail(email);
    if (existing) {
        if (existing.role === 'admin') {
            return { error: 'conflict', message: 'El usuario ya es admin' };
        }

        const promoted = await adminUsersRepository.updateUserRole(existing.id, 'admin');
        return {
            data: {
                action: 'promoted',
                user: buildUserResponse(promoted || { ...existing, role: 'admin' }),
            },
        };
    }

    const firstName = normalizeName(payload && payload.firstName);
    const lastName = normalizeName(payload && payload.lastName);
    const password = String(payload && payload.password ? payload.password : '');

    if (!firstName) {
        return { error: 'bad_request', message: 'firstName requerido' };
    }
    if (!lastName) {
        return { error: 'bad_request', message: 'lastName requerido' };
    }
    if (!isStrongEnoughPassword(password)) {
        return { error: 'bad_request', message: 'Password invalido (minimo 8 caracteres)' };
    }

    try {
        const passwordHash = await bcrypt.hash(password, 10);
        const created = await adminUsersRepository.createUser({
            email,
            firstName,
            lastName,
            passwordHash,
            role: 'admin',
            emailVerifiedAt: new Date(),
            googleId: null,
            avatarUrl: null,
            isActive: true,
        });

        return {
            data: {
                action: 'created',
                user: buildUserResponse(created),
            },
        };
    } catch (error) {
        if (error && error.name === 'SequelizeUniqueConstraintError') {
            return { error: 'conflict', message: 'Email ya registrado' };
        }

        throw error;
    }
}

module.exports = {
    listAdminUsers,
    createOrPromoteAdmin,
};
