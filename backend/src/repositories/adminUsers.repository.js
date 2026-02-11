const { User, sequelize } = require('../models');

function toPlain(row) {
    return row ? row.get({ plain: true }) : null;
}

async function listAdminUsers() {
    const rows = await User.findAll({
        where: { role: 'admin' },
        attributes: [
            'id',
            'email',
            'firstName',
            'lastName',
            'role',
            'isActive',
            'emailVerifiedAt',
            [sequelize.col('created_at'), 'createdAt'],
            [sequelize.col('updated_at'), 'updatedAt'],
        ],
        order: [['id', 'ASC']],
    });

    return rows.map(toPlain);
}

async function findUserByEmail(email) {
    const row = await User.findOne({ where: { email } });
    return toPlain(row);
}

async function createUser(payload, options = {}) {
    const row = await User.create(payload, {
        transaction: options.transaction,
    });
    return toPlain(row);
}

async function updateUserRole(userId, role, options = {}) {
    const [count, rows] = await User.update(
        { role },
        {
            where: { id: userId },
            returning: true,
            transaction: options.transaction,
        }
    );

    if (!count || !rows.length) {
        return null;
    }

    return toPlain(rows[0]);
}

module.exports = {
    listAdminUsers,
    findUserByEmail,
    createUser,
    updateUserRole,
};
