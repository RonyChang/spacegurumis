const { Op } = require('sequelize');
const {
    Order,
    OrderItem,
    User,
    ProductVariant,
    Inventory,
    sequelize,
} = require('../models');

function buildOrderFilters(filters) {
    const orderWhere = {};
    if (filters.orderStatus) {
        orderWhere.orderStatus = filters.orderStatus;
    }

    if (filters.paymentStatus) {
        orderWhere.paymentStatus = filters.paymentStatus;
    }

    const userWhere = {};
    if (filters.email) {
        userWhere.email = { [Op.iLike]: `%${filters.email}%` };
    }

    return {
        orderWhere,
        userWhere: Object.keys(userWhere).length ? userWhere : null,
    };
}

async function fetchOrders(filters, pagination) {
    const { orderWhere, userWhere } = buildOrderFilters(filters);
    const userInclude = {
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'firstName', 'lastName'],
        required: Boolean(userWhere),
    };

    if (userWhere) {
        userInclude.where = userWhere;
    }

    const rows = await Order.findAll({
        where: orderWhere,
        include: [
            userInclude,
            {
                model: OrderItem,
                as: 'items',
                attributes: [
                    'id',
                    'productVariantId',
                    'sku',
                    'productName',
                    'variantName',
                    'priceCents',
                    'quantity',
                ],
                required: false,
            },
        ],
        order: [[sequelize.literal('"Order"."created_at"'), 'DESC']],
        limit: pagination.pageSize,
        offset: (pagination.page - 1) * pagination.pageSize,
        subQuery: false,
    });

    return rows.map((row) => row.get({ plain: true }));
}

async function fetchOrdersCount(filters) {
    const { orderWhere, userWhere } = buildOrderFilters(filters);
    const include = [];

    if (userWhere) {
        include.push({
            model: User,
            as: 'user',
            where: userWhere,
            required: true,
        });
    }

    const total = await Order.count({
        where: orderWhere,
        include,
        distinct: true,
        col: 'id',
    });

    return total || 0;
}

async function findVariantBySku(sku) {
    const variant = await ProductVariant.findOne({
        where: { sku },
        attributes: ['id', 'sku', 'variantName'],
    });

    return variant ? variant.get({ plain: true }) : null;
}

async function findInventoryByVariantId(productVariantId) {
    const inventory = await Inventory.findOne({
        where: { productVariantId },
        attributes: ['id', 'stock', 'reserved', 'productVariantId'],
    });

    return inventory ? inventory.get({ plain: true }) : null;
}

async function createInventory(productVariantId, stock) {
    const inventory = await Inventory.create({
        productVariantId,
        stock,
        reserved: 0,
    });

    return inventory.get({ plain: true });
}

async function updateInventoryStock(inventoryId, stock) {
    const inventory = await Inventory.findByPk(inventoryId);
    if (!inventory) {
        return null;
    }

    inventory.stock = stock;
    await inventory.save();
    return inventory.get({ plain: true });
}

module.exports = {
    fetchOrders,
    fetchOrdersCount,
    findVariantBySku,
    findInventoryByVariantId,
    createInventory,
    updateInventoryStock,
};
