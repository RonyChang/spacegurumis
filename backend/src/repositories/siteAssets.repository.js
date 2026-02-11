const { Op } = require('sequelize');
const { SiteAsset } = require('../models');

function toPlain(row) {
    return row ? row.get({ plain: true }) : null;
}

async function createSiteAsset(data) {
    const created = await SiteAsset.create({
        slot: data.slot,
        title: data.title || null,
        altText: data.altText || null,
        imageKey: data.imageKey,
        publicUrl: data.publicUrl,
        contentType: data.contentType,
        byteSize: data.byteSize,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
        startsAt: data.startsAt || null,
        endsAt: data.endsAt || null,
    });

    return toPlain(created);
}

async function listSiteAssets(filters = {}) {
    const where = {};
    if (filters.slot) {
        where.slot = filters.slot;
    }

    const rows = await SiteAsset.findAll({
        where,
        order: [['slot', 'ASC'], ['sortOrder', 'ASC'], ['id', 'ASC']],
    });

    return rows.map(toPlain);
}

async function findSiteAssetById(id) {
    const row = await SiteAsset.findByPk(id);
    return toPlain(row);
}

async function updateSiteAsset(id, patch) {
    const [count] = await SiteAsset.update(patch, { where: { id } });
    if (!count) {
        return null;
    }

    return findSiteAssetById(id);
}

async function deleteSiteAsset(id) {
    const count = await SiteAsset.destroy({ where: { id } });
    return count > 0;
}

async function listActiveSiteAssetsBySlot(slot, now = new Date()) {
    const rows = await SiteAsset.findAll({
        where: {
            slot,
            isActive: true,
            [Op.and]: [
                {
                    [Op.or]: [
                        { startsAt: null },
                        { startsAt: { [Op.lte]: now } },
                    ],
                },
                {
                    [Op.or]: [
                        { endsAt: null },
                        { endsAt: { [Op.gte]: now } },
                    ],
                },
            ],
        },
        order: [['sortOrder', 'ASC'], ['id', 'ASC']],
    });

    return rows.map(toPlain);
}

module.exports = {
    createSiteAsset,
    listSiteAssets,
    findSiteAssetById,
    updateSiteAsset,
    deleteSiteAsset,
    listActiveSiteAssetsBySlot,
};
