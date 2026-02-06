const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    email: {
        type: DataTypes.STRING(160),
        allowNull: false,
        unique: true,
    },
    firstName: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    lastName: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    passwordHash: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    googleId: {
        type: DataTypes.STRING(200),
        allowNull: true,
        unique: true,
    },
    avatarUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    emailVerifiedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'email_verified_at',
    },
    role: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'customer',
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
}, {
    tableName: 'users',
});

const AdminTwoFactorChallenge = sequelize.define('AdminTwoFactorChallenge', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    userId: {
        type: DataTypes.BIGINT,
        allowNull: false,
        unique: true,
    },
    codeHash: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: 'code_hash',
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'expires_at',
    },
    attempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    lockedUntil: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'locked_until',
    },
}, {
    tableName: 'admin_2fa_challenges',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

const EmailVerification = sequelize.define('EmailVerification', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    userId: {
        type: DataTypes.BIGINT,
        allowNull: false,
    },
    codeHash: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: 'code_hash',
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'expires_at',
    },
}, {
    tableName: 'email_verifications',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
});

const UserAddress = sequelize.define('UserAddress', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    userId: {
        type: DataTypes.BIGINT,
        allowNull: false,
        unique: true,
    },
    receiverName: {
        type: DataTypes.STRING(160),
        allowNull: false,
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: false,
    },
    addressLine1: {
        type: DataTypes.STRING(200),
        allowNull: false,
    },
    addressLine2: {
        type: DataTypes.STRING(200),
        allowNull: true,
    },
    country: {
        type: DataTypes.STRING(80),
        allowNull: false,
    },
    city: {
        type: DataTypes.STRING(120),
        allowNull: false,
    },
    district: {
        type: DataTypes.STRING(120),
        allowNull: false,
    },
    postalCode: {
        type: DataTypes.STRING(20),
        allowNull: true,
    },
    reference: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    tableName: 'user_addresses',
});

const Category = sequelize.define('Category', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING(120),
        allowNull: false,
    },
    slug: {
        type: DataTypes.STRING(120),
        allowNull: false,
        unique: true,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
}, {
    tableName: 'categories',
});

const Product = sequelize.define('Product', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    categoryId: {
        type: DataTypes.BIGINT,
        allowNull: true,
    },
    name: {
        type: DataTypes.STRING(160),
        allowNull: false,
    },
    slug: {
        type: DataTypes.STRING(160),
        allowNull: false,
        unique: true,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
}, {
    tableName: 'products',
});

const ProductVariant = sequelize.define('ProductVariant', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    productId: {
        type: DataTypes.BIGINT,
        allowNull: false,
    },
    sku: {
        type: DataTypes.STRING(80),
        allowNull: false,
        unique: true,
    },
    variantName: {
        type: DataTypes.STRING(120),
        allowNull: true,
    },
    priceCents: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    weightGrams: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    sizeLabel: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
}, {
    tableName: 'product_variants',
});

const Inventory = sequelize.define('Inventory', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    productVariantId: {
        type: DataTypes.BIGINT,
        allowNull: false,
    },
    stock: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    reserved: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
}, {
    tableName: 'inventory',
    timestamps: true,
    createdAt: false,
    updatedAt: 'updated_at',
});

const Cart = sequelize.define('Cart', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    userId: {
        type: DataTypes.BIGINT,
        allowNull: false,
        unique: true,
    },
}, {
    tableName: 'carts',
});

const CartItem = sequelize.define('CartItem', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    cartId: {
        type: DataTypes.BIGINT,
        allowNull: false,
    },
    productVariantId: {
        type: DataTypes.BIGINT,
        allowNull: false,
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
    },
}, {
    tableName: 'cart_items',
});

const Order = sequelize.define('Order', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    userId: {
        type: DataTypes.BIGINT,
        allowNull: false,
    },
    orderStatus: {
        type: DataTypes.STRING(40),
        allowNull: false,
        defaultValue: 'pendingPayment',
    },
    paymentStatus: {
        type: DataTypes.STRING(40),
        allowNull: false,
        defaultValue: 'pending',
    },
    subtotalCents: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    totalCents: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    shippingCostCents: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    discountCode: {
        type: DataTypes.STRING(80),
        allowNull: true,
    },
    discountPercentage: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    discountAmountCents: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    stripeSessionId: {
        type: DataTypes.STRING(200),
        allowNull: true,
    },
    stripePaymentIntentId: {
        type: DataTypes.STRING(200),
        allowNull: true,
    },
    paymentEmailSentAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'payment_email_sent_at',
    },
    shippedEmailSentAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'shipped_email_sent_at',
    },
    deliveredEmailSentAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'delivered_email_sent_at',
    },
}, {
    tableName: 'orders',
});

const OrderItem = sequelize.define('OrderItem', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    orderId: {
        type: DataTypes.BIGINT,
        allowNull: false,
    },
    productVariantId: {
        type: DataTypes.BIGINT,
        allowNull: false,
    },
    sku: {
        type: DataTypes.STRING(80),
        allowNull: false,
    },
    productName: {
        type: DataTypes.STRING(160),
        allowNull: false,
    },
    variantName: {
        type: DataTypes.STRING(120),
        allowNull: true,
    },
    priceCents: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
    },
}, {
    tableName: 'order_items',
});

const DiscountCode = sequelize.define('DiscountCode', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    code: {
        type: DataTypes.STRING(80),
        allowNull: false,
        unique: true,
    },
    percentage: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    minSubtotalCents: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    maxUses: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    usedCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    startsAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    tableName: 'discount_codes',
});

const DiscountRedemption = sequelize.define('DiscountRedemption', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    discountCodeId: {
        type: DataTypes.BIGINT,
        allowNull: false,
    },
    orderId: {
        type: DataTypes.BIGINT,
        allowNull: false,
    },
    userId: {
        type: DataTypes.BIGINT,
        allowNull: false,
    },
}, {
    tableName: 'discount_redemptions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
});
User.hasOne(UserAddress, { foreignKey: 'userId', as: 'address' });
UserAddress.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasOne(AdminTwoFactorChallenge, { foreignKey: 'userId', as: 'adminTwoFactor' });
AdminTwoFactorChallenge.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(EmailVerification, { foreignKey: 'userId', as: 'emailVerifications' });
EmailVerification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasOne(Cart, { foreignKey: 'userId', as: 'cart' });
Cart.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Category.hasMany(Product, { foreignKey: 'categoryId', as: 'products' });
Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

Product.hasMany(ProductVariant, { foreignKey: 'productId', as: 'variants' });
ProductVariant.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

ProductVariant.hasOne(Inventory, { foreignKey: 'productVariantId', as: 'inventory' });
Inventory.belongsTo(ProductVariant, { foreignKey: 'productVariantId', as: 'variant' });

Cart.hasMany(CartItem, { foreignKey: 'cartId', as: 'items' });
CartItem.belongsTo(Cart, { foreignKey: 'cartId', as: 'cart' });
CartItem.belongsTo(ProductVariant, { foreignKey: 'productVariantId', as: 'variant' });

User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
OrderItem.belongsTo(ProductVariant, { foreignKey: 'productVariantId', as: 'variant' });

DiscountCode.hasMany(DiscountRedemption, { foreignKey: 'discountCodeId', as: 'redemptions' });
DiscountRedemption.belongsTo(DiscountCode, { foreignKey: 'discountCodeId', as: 'discount' });
Order.hasMany(DiscountRedemption, { foreignKey: 'orderId', as: 'discountRedemptions' });
DiscountRedemption.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
User.hasMany(DiscountRedemption, { foreignKey: 'userId', as: 'discountRedemptions' });
DiscountRedemption.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = {
    sequelize,
    User,
    AdminTwoFactorChallenge,
    EmailVerification,
    UserAddress,
    Category,
    Product,
    ProductVariant,
    Inventory,
    Cart,
    CartItem,
    Order,
    OrderItem,
    DiscountCode,
    DiscountRedemption,
};
