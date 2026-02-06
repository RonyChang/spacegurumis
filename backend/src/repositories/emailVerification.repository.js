const { EmailVerification } = require('../models');

async function createVerification({ userId, codeHash, expiresAt }) {
    const record = await EmailVerification.create({
        userId,
        codeHash,
        expiresAt,
    });

    return record.get({ plain: true });
}

async function findLatestByUserId(userId) {
    const record = await EmailVerification.findOne({
        where: { userId },
        order: [['created_at', 'DESC']],
    });

    return record ? record.get({ plain: true }) : null;
}

async function deleteByUserId(userId) {
    return EmailVerification.destroy({ where: { userId } });
}

module.exports = {
    createVerification,
    findLatestByUserId,
    deleteByUserId,
};
