const { Op } = require('sequelize');
const { PasswordResetToken } = require('../models');

async function createToken({ userId, tokenHash, expiresAt }, options = {}) {
    const record = await PasswordResetToken.create(
        {
            userId,
            tokenHash,
            expiresAt,
            usedAt: null,
        },
        options
    );

    return record.get({ plain: true });
}

async function findLatestByUserId(userId) {
    const record = await PasswordResetToken.findOne({
        where: { userId },
        order: [['created_at', 'DESC']],
    });

    return record ? record.get({ plain: true }) : null;
}

async function findActiveByTokenHash(tokenHash, options = {}) {
    const where = {
        tokenHash,
        usedAt: null,
        expiresAt: { [Op.gt]: new Date() },
    };

    const record = await PasswordResetToken.findOne({
        ...options,
        where,
    });

    return record ? record.get({ plain: true }) : null;
}

async function consumeToken(tokenId, usedAt = new Date(), options = {}) {
    const [updatedCount] = await PasswordResetToken.update(
        { usedAt },
        {
            ...options,
            where: {
                id: tokenId,
                usedAt: null,
            },
        }
    );

    return updatedCount;
}

async function invalidateActiveTokensByUserId(userId, usedAt = new Date(), options = {}) {
    const { excludeId, ...queryOptions } = options;
    const where = {
        userId,
        usedAt: null,
    };

    if (excludeId) {
        where.id = { [Op.ne]: excludeId };
    }

    const [updatedCount] = await PasswordResetToken.update(
        { usedAt },
        {
            ...queryOptions,
            where,
        }
    );

    return updatedCount;
}

module.exports = {
    createToken,
    findLatestByUserId,
    findActiveByTokenHash,
    consumeToken,
    invalidateActiveTokensByUserId,
};
