const { User, UserAddress } = require('../models');

async function findUserById(userId) {
    const user = await User.findOne({
        where: { id: userId, isActive: true },
        attributes: ['id', 'email', 'firstName', 'lastName', 'role'],
    });

    return user ? user.get({ plain: true }) : null;
}

async function updateUserNames(userId, firstName, lastName) {
    const user = await User.findOne({
        where: { id: userId },
        attributes: ['id', 'email', 'firstName', 'lastName', 'role'],
    });

    if (!user) {
        return null;
    }

    if (firstName !== null) {
        user.firstName = firstName;
    }

    if (lastName !== null) {
        user.lastName = lastName;
    }

    await user.save();
    return user.get({ plain: true });
}

async function findAddressByUserId(userId) {
    const address = await UserAddress.findOne({
        where: { userId },
        attributes: [
            'receiverName',
            'phone',
            'addressLine1',
            'addressLine2',
            'country',
            'city',
            'district',
            'postalCode',
            'reference',
        ],
    });

    return address ? address.get({ plain: true }) : null;
}

async function upsertAddress(userId, address) {
    await UserAddress.upsert({
        userId,
        receiverName: address.receiverName,
        phone: address.phone,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        country: address.country,
        city: address.city,
        district: address.district,
        postalCode: address.postalCode,
        reference: address.reference,
    });

    return findAddressByUserId(userId);
}

module.exports = {
    findUserById,
    updateUserNames,
    findAddressByUserId,
    upsertAddress,
};
