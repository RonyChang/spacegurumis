const { DiscountCode, DiscountRedemption } = require('../models');

async function findDiscountByCode(code, transaction) {
    const discount = await DiscountCode.findOne({
        where: { code },
        transaction,
        lock: transaction ? transaction.LOCK.UPDATE : undefined,
    });

    return discount ? discount.get({ plain: true }) : null;
}

async function incrementDiscountUsage(discountCodeId, transaction) {
    const discount = await DiscountCode.findOne({
        where: { id: discountCodeId },
        transaction,
        lock: transaction ? transaction.LOCK.UPDATE : undefined,
    });

    if (!discount) {
        return null;
    }

    discount.usedCount = Number(discount.usedCount || 0) + 1;
    await discount.save({ transaction });
    return discount.get({ plain: true });
}

async function createRedemption({ discountCodeId, orderId, userId }, transaction) {
    const redemption = await DiscountRedemption.create(
        {
            discountCodeId,
            orderId,
            userId,
        },
        { transaction }
    );

    return redemption.get({ plain: true });
}

module.exports = {
    findDiscountByCode,
    incrementDiscountUsage,
    createRedemption,
};
