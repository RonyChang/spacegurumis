const { User } = require('../models');

async function findUserByEmail(email) {
    const user = await User.findOne({ where: { email } });
    return user ? user.get({ plain: true }) : null;
}

async function createUser({
    email,
    firstName,
    lastName,
    passwordHash,
    role,
    googleId,
    avatarUrl,
    emailVerifiedAt,
}) {
    const user = await User.create({
        email,
        firstName,
        lastName,
        passwordHash,
        role,
        googleId,
        avatarUrl,
        emailVerifiedAt,
    });
    return user.get({ plain: true });
}

async function findUserByGoogleId(googleId) {
    const user = await User.findOne({ where: { googleId } });
    return user ? user.get({ plain: true }) : null;
}

async function linkGoogleAccount({ userId, googleId, avatarUrl }) {
    const [updatedCount, rows] = await User.update(
        { googleId, avatarUrl },
        { where: { id: userId }, returning: true }
    );

    if (!updatedCount || !rows.length) {
        return null;
    }

    return rows[0].get({ plain: true });
}

async function updateUserRole(userId, role) {
    const [updatedCount, rows] = await User.update(
        { role },
        { where: { id: userId }, returning: true }
    );

    if (!updatedCount || !rows.length) {
        return null;
    }

    return rows[0].get({ plain: true });
}

async function updateUserEmailVerifiedAt(userId, emailVerifiedAt) {
    const [updatedCount, rows] = await User.update(
        { emailVerifiedAt },
        { where: { id: userId }, returning: true }
    );

    if (!updatedCount || !rows.length) {
        return null;
    }

    return rows[0].get({ plain: true });
}

module.exports = {
    findUserByEmail,
    createUser,
    findUserByGoogleId,
    linkGoogleAccount,
    updateUserRole,
    updateUserEmailVerifiedAt,
};
