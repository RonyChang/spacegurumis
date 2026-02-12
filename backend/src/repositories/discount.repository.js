const { DiscountCode, DiscountRedemption } = require('../models');

function toPlain(row) {
    return row ? row.get({ plain: true }) : null;
}

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

async function listDiscountCodes() {
    const rows = await DiscountCode.findAll({
        order: [['id', 'DESC']],
    });
    return rows.map(toPlain);
}

async function createDiscountCode(payload, transaction) {
    const row = await DiscountCode.create(payload, { transaction });
    return toPlain(row);
}

async function findDiscountById(id, transaction) {
    const row = await DiscountCode.findByPk(id, { transaction });
    return toPlain(row);
}

async function updateDiscountCode(id, patch, transaction) {
    const [count] = await DiscountCode.update(patch, {
        where: { id },
        transaction,
    });

    if (!count) {
        return null;
    }

    return findDiscountById(id, transaction);
}

async function deleteDiscountCode(id, transaction) {
    const count = await DiscountCode.destroy({
        where: { id },
        transaction,
    });
    return count > 0;
}

module.exports = {
    findDiscountByCode,
    findDiscountById,
    incrementDiscountUsage,
    createRedemption,
    listDiscountCodes,
    createDiscountCode,
    updateDiscountCode,
    deleteDiscountCode,
};
