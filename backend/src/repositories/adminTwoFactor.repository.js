const { AdminTwoFactorChallenge } = require('../models');

async function saveChallenge({ userId, codeHash, expiresAt }) {
    const existing = await AdminTwoFactorChallenge.findOne({ where: { userId } });
    if (existing) {
        existing.codeHash = codeHash;
        existing.expiresAt = expiresAt;
        existing.attempts = 0;
        existing.lockedUntil = null;
        await existing.save();
        return existing.get({ plain: true });
    }

    const record = await AdminTwoFactorChallenge.create({
        userId,
        codeHash,
        expiresAt,
        attempts: 0,
        lockedUntil: null,
    });
    return record.get({ plain: true });
}

async function findChallengeByUserId(userId) {
    const record = await AdminTwoFactorChallenge.findOne({ where: { userId } });
    return record ? record.get({ plain: true }) : null;
}

async function incrementAttempts(userId) {
    const record = await AdminTwoFactorChallenge.findOne({ where: { userId } });
    if (!record) {
        return null;
    }

    record.attempts += 1;
    await record.save();
    return record.get({ plain: true });
}

async function setLockedUntil(userId, lockedUntil) {
    const record = await AdminTwoFactorChallenge.findOne({ where: { userId } });
    if (!record) {
        return null;
    }

    record.lockedUntil = lockedUntil;
    await record.save();
    return record.get({ plain: true });
}

async function clearChallenge(userId) {
    return AdminTwoFactorChallenge.destroy({ where: { userId } });
}

module.exports = {
    saveChallenge,
    findChallengeByUserId,
    incrementAttempts,
    setLockedUntil,
    clearChallenge,
};
