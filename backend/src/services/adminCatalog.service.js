const { sequelize } = require('../models');
const adminCatalogRepository = require('../repositories/adminCatalog.repository');

function parsePositiveInt(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
        return null;
    }
    return parsed;
}

function parseNonNegativeInt(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
        return null;
    }
    return parsed;
}

function parseNullableString(value) {
    if (value === undefined) {
        return { provided: false, value: null };
    }
    if (value === null) {
        return { provided: true, value: null };
    }

    const text = String(value).trim();
    return { provided: true, value: text || null };
}

function parseNullableNumber(value) {
    if (value === undefined || value === null || value === '') {
        return { provided: false, value: null };
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return { provided: true, value: null, error: true };
    }
    return { provided: true, value: parsed, error: false };
}

function parseBoolean(value, defaultValue = false) {
    if (value === undefined) {
        return defaultValue;
    }
    if (typeof value === 'boolean') {
        return value;
    }

    const normalized = String(value).trim().toLowerCase();
    return ['1', 'true', 'yes', 'y', 'on'].includes(normalized);
}

function centsToSoles(value) {
    if (value === null || value === undefined) {
        return null;
    }

    const cents = Number(value);
    if (!Number.isFinite(cents)) {
        return null;
    }

    return Number((cents / 100).toFixed(2));
}

function normalizeProductRow(row) {
    const variants = Array.isArray(row.variants)
        ? row.variants.map((variant) => ({
            id: variant.id,
            sku: variant.sku,
            variantName: variant.variantName || null,
            price: centsToSoles(variant.priceCents),
            weightGrams: variant.weightGrams == null ? null : Number(variant.weightGrams),
            sizeLabel: variant.sizeLabel || null,
            stock: variant.inventory ? Number(variant.inventory.stock || 0) : 0,
            reserved: variant.inventory ? Number(variant.inventory.reserved || 0) : 0,
        }))
        : [];

    return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description || null,
        isActive: Boolean(row.isActive),
        category: row.category
            ? {
                id: row.category.id,
                name: row.category.name,
                slug: row.category.slug,
                isActive: Boolean(row.category.isActive),
            }
            : null,
        variants,
    };
}

function isUniqueConstraintError(error) {
    return Boolean(error && error.name === 'SequelizeUniqueConstraintError');
}

function uniqueMessage(error) {
    if (!error || !Array.isArray(error.errors) || !error.errors.length) {
        return 'Valor duplicado';
    }

    const paths = new Set(error.errors.map((item) => item && item.path).filter(Boolean));
    if (paths.has('slug')) {
        return 'Slug ya registrado';
    }
    if (paths.has('sku')) {
        return 'SKU ya registrado';
    }
    if (paths.has('name')) {
        return 'Nombre ya registrado';
    }
    return 'Valor duplicado';
}

async function listCategories() {
    const rows = await adminCatalogRepository.listCategories();
    return {
        data: rows.map((row) => ({
            id: row.id,
            name: row.name,
            slug: row.slug,
            isActive: Boolean(row.isActive),
        })),
    };
}

async function createCategory(payload) {
    const name = String(payload && payload.name ? payload.name : '').trim();
    const slug = String(payload && payload.slug ? payload.slug : '').trim().toLowerCase();
    const description = parseNullableString(payload && payload.description);
    const isActive = parseBoolean(payload && payload.isActive, true);

    if (!name) {
        return { error: 'bad_request', message: 'name requerido' };
    }
    if (!slug) {
        return { error: 'bad_request', message: 'slug requerido' };
    }

    try {
        const created = await adminCatalogRepository.createCategory({
            name,
            slug,
            description: description.value,
            isActive,
        });

        return {
            data: {
                id: created.id,
                name: created.name,
                slug: created.slug,
                description: created.description || null,
                isActive: Boolean(created.isActive),
            },
        };
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            return { error: 'conflict', message: uniqueMessage(error) };
        }
        throw error;
    }
}

async function listProducts() {
    const rows = await adminCatalogRepository.listProducts();
    return {
        data: rows.map(normalizeProductRow),
    };
}

async function createProduct(payload) {
    const name = String(payload && payload.name ? payload.name : '').trim();
    const slug = String(payload && payload.slug ? payload.slug : '').trim().toLowerCase();
    const description = parseNullableString(payload && payload.description);
    const categoryId = parsePositiveInt(payload && payload.categoryId);
    const isActive = parseBoolean(payload && payload.isActive, true);

    const sku = String(payload && payload.sku ? payload.sku : '').trim();
    const variantName = parseNullableString(payload && payload.variantName);
    const price = Number(payload && payload.price);
    const initialStock = parseNonNegativeInt(payload && payload.initialStock);

    const weightGrams = parseNullableNumber(payload && payload.weightGrams);
    const sizeLabel = parseNullableString(payload && payload.sizeLabel);

    if (!name) {
        return { error: 'bad_request', message: 'name requerido' };
    }
    if (!slug) {
        return { error: 'bad_request', message: 'slug requerido' };
    }
    if (!sku) {
        return { error: 'bad_request', message: 'sku requerido' };
    }
    if (!Number.isFinite(price) || price < 0) {
        return { error: 'bad_request', message: 'price invalido' };
    }
    if (initialStock === null) {
        return { error: 'bad_request', message: 'initialStock invalido' };
    }
    if (payload && payload.categoryId !== undefined && categoryId === null) {
        return { error: 'bad_request', message: 'categoryId invalido' };
    }
    if (weightGrams.error) {
        return { error: 'bad_request', message: 'weightGrams invalido' };
    }

    if (categoryId) {
        const category = await adminCatalogRepository.findCategoryById(categoryId);
        if (!category) {
            return { error: 'bad_request', message: 'Categoria no encontrada' };
        }
    }

    try {
        const created = await sequelize.transaction(async (transaction) => {
            const product = await adminCatalogRepository.createProduct(
                {
                    categoryId: categoryId || null,
                    name,
                    slug,
                    description: description.value,
                    isActive,
                },
                { transaction }
            );

            const variant = await adminCatalogRepository.createVariant(
                {
                    productId: product.id,
                    sku,
                    variantName: variantName.value,
                    priceCents: Math.round(price * 100),
                    weightGrams: weightGrams.provided ? weightGrams.value : null,
                    sizeLabel: sizeLabel.value,
                },
                { transaction }
            );

            const inventory = await adminCatalogRepository.createInventory(
                {
                    productVariantId: variant.id,
                    stock: initialStock,
                    reserved: 0,
                },
                { transaction }
            );

            return {
                product,
                variant,
                inventory,
            };
        });

        return {
            data: {
                product: {
                    id: created.product.id,
                    name: created.product.name,
                    slug: created.product.slug,
                    description: created.product.description || null,
                    isActive: Boolean(created.product.isActive),
                    categoryId: created.product.categoryId || null,
                },
                variant: {
                    id: created.variant.id,
                    productId: created.variant.productId,
                    sku: created.variant.sku,
                    variantName: created.variant.variantName || null,
                    price: centsToSoles(created.variant.priceCents),
                    weightGrams: created.variant.weightGrams == null ? null : Number(created.variant.weightGrams),
                    sizeLabel: created.variant.sizeLabel || null,
                },
                inventory: {
                    id: created.inventory.id,
                    productVariantId: created.inventory.productVariantId,
                    stock: Number(created.inventory.stock || 0),
                    reserved: Number(created.inventory.reserved || 0),
                },
            },
        };
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            return { error: 'conflict', message: uniqueMessage(error) };
        }
        throw error;
    }
}

async function updateProduct(productId, payload) {
    const parsedId = parsePositiveInt(productId);
    if (!parsedId) {
        return { error: 'bad_request', message: 'productId invalido' };
    }

    const update = {};
    const name = parseNullableString(payload && payload.name);
    const slug = parseNullableString(payload && payload.slug);
    const description = parseNullableString(payload && payload.description);
    const isActive = payload && Object.prototype.hasOwnProperty.call(payload, 'isActive')
        ? parseBoolean(payload.isActive, false)
        : null;
    const categoryId = payload && Object.prototype.hasOwnProperty.call(payload, 'categoryId')
        ? parsePositiveInt(payload.categoryId)
        : null;

    if (name.provided) {
        if (!name.value) {
            return { error: 'bad_request', message: 'name invalido' };
        }
        update.name = name.value;
    }

    if (slug.provided) {
        if (!slug.value) {
            return { error: 'bad_request', message: 'slug invalido' };
        }
        update.slug = slug.value.toLowerCase();
    }

    if (description.provided) {
        update.description = description.value;
    }

    if (isActive !== null) {
        update.isActive = isActive;
    }

    if (payload && Object.prototype.hasOwnProperty.call(payload, 'categoryId')) {
        if (payload.categoryId === null || payload.categoryId === '') {
            update.categoryId = null;
        } else if (!categoryId) {
            return { error: 'bad_request', message: 'categoryId invalido' };
        } else {
            const category = await adminCatalogRepository.findCategoryById(categoryId);
            if (!category) {
                return { error: 'bad_request', message: 'Categoria no encontrada' };
            }
            update.categoryId = categoryId;
        }
    }

    if (!Object.keys(update).length) {
        return { error: 'bad_request', message: 'Sin cambios para actualizar' };
    }

    try {
        const updated = await adminCatalogRepository.updateProduct(parsedId, update);
        if (!updated) {
            return { error: 'not_found' };
        }

        return {
            data: {
                id: updated.id,
                name: updated.name,
                slug: updated.slug,
                description: updated.description || null,
                isActive: Boolean(updated.isActive),
                categoryId: updated.categoryId || null,
            },
        };
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            return { error: 'conflict', message: uniqueMessage(error) };
        }
        throw error;
    }
}

async function createVariant(productId, payload) {
    const parsedProductId = parsePositiveInt(productId);
    if (!parsedProductId) {
        return { error: 'bad_request', message: 'productId invalido' };
    }

    const product = await adminCatalogRepository.findProductById(parsedProductId);
    if (!product) {
        return { error: 'not_found', message: 'Producto no encontrado' };
    }

    const sku = String(payload && payload.sku ? payload.sku : '').trim();
    const variantName = parseNullableString(payload && payload.variantName);
    const price = Number(payload && payload.price);
    const initialStock = payload && Object.prototype.hasOwnProperty.call(payload, 'initialStock')
        ? parseNonNegativeInt(payload.initialStock)
        : 0;
    const weightGrams = parseNullableNumber(payload && payload.weightGrams);
    const sizeLabel = parseNullableString(payload && payload.sizeLabel);

    if (!sku) {
        return { error: 'bad_request', message: 'sku requerido' };
    }
    if (!Number.isFinite(price) || price < 0) {
        return { error: 'bad_request', message: 'price invalido' };
    }
    if (initialStock === null) {
        return { error: 'bad_request', message: 'initialStock invalido' };
    }
    if (weightGrams.error) {
        return { error: 'bad_request', message: 'weightGrams invalido' };
    }

    try {
        const created = await sequelize.transaction(async (transaction) => {
            const variant = await adminCatalogRepository.createVariant(
                {
                    productId: parsedProductId,
                    sku,
                    variantName: variantName.value,
                    priceCents: Math.round(price * 100),
                    weightGrams: weightGrams.provided ? weightGrams.value : null,
                    sizeLabel: sizeLabel.value,
                },
                { transaction }
            );

            const inventory = await adminCatalogRepository.createInventory(
                {
                    productVariantId: variant.id,
                    stock: initialStock,
                    reserved: 0,
                },
                { transaction }
            );

            return {
                variant,
                inventory,
            };
        });

        return {
            data: {
                variant: {
                    id: created.variant.id,
                    productId: created.variant.productId,
                    sku: created.variant.sku,
                    variantName: created.variant.variantName || null,
                    price: centsToSoles(created.variant.priceCents),
                    weightGrams: created.variant.weightGrams == null ? null : Number(created.variant.weightGrams),
                    sizeLabel: created.variant.sizeLabel || null,
                },
                inventory: {
                    id: created.inventory.id,
                    productVariantId: created.inventory.productVariantId,
                    stock: Number(created.inventory.stock || 0),
                    reserved: Number(created.inventory.reserved || 0),
                },
            },
        };
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            return { error: 'conflict', message: uniqueMessage(error) };
        }
        throw error;
    }
}

async function updateVariant(variantId, payload) {
    const parsedId = parsePositiveInt(variantId);
    if (!parsedId) {
        return { error: 'bad_request', message: 'variantId invalido' };
    }

    const update = {};

    const sku = parseNullableString(payload && payload.sku);
    const variantName = parseNullableString(payload && payload.variantName);
    const weightGrams = parseNullableNumber(payload && payload.weightGrams);
    const sizeLabel = parseNullableString(payload && payload.sizeLabel);
    const price = payload && Object.prototype.hasOwnProperty.call(payload, 'price')
        ? Number(payload.price)
        : null;

    if (sku.provided) {
        if (!sku.value) {
            return { error: 'bad_request', message: 'sku invalido' };
        }
        update.sku = sku.value;
    }

    if (variantName.provided) {
        update.variantName = variantName.value;
    }

    if (weightGrams.provided) {
        if (weightGrams.error) {
            return { error: 'bad_request', message: 'weightGrams invalido' };
        }
        update.weightGrams = weightGrams.value;
    }

    if (sizeLabel.provided) {
        update.sizeLabel = sizeLabel.value;
    }

    if (price !== null) {
        if (!Number.isFinite(price) || price < 0) {
            return { error: 'bad_request', message: 'price invalido' };
        }
        update.priceCents = Math.round(price * 100);
    }

    if (!Object.keys(update).length) {
        return { error: 'bad_request', message: 'Sin cambios para actualizar' };
    }

    try {
        const updated = await adminCatalogRepository.updateVariant(parsedId, update);
        if (!updated) {
            return { error: 'not_found' };
        }

        return {
            data: {
                id: updated.id,
                productId: updated.productId,
                sku: updated.sku,
                variantName: updated.variantName || null,
                price: centsToSoles(updated.priceCents),
                weightGrams: updated.weightGrams == null ? null : Number(updated.weightGrams),
                sizeLabel: updated.sizeLabel || null,
            },
        };
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            return { error: 'conflict', message: uniqueMessage(error) };
        }
        throw error;
    }
}

async function updateVariantStock(variantId, payload) {
    const parsedVariantId = parsePositiveInt(variantId);
    if (!parsedVariantId) {
        return { error: 'bad_request', message: 'variantId invalido' };
    }

    const stock = parseNonNegativeInt(payload && payload.stock);
    if (stock === null) {
        return { error: 'bad_request', message: 'stock invalido' };
    }

    const variant = await adminCatalogRepository.findVariantById(parsedVariantId);
    if (!variant) {
        return { error: 'not_found' };
    }

    const inventory = await adminCatalogRepository.findInventoryByVariantId(parsedVariantId);
    const reserved = inventory ? Number(inventory.reserved || 0) : 0;
    if (stock < reserved) {
        return { error: 'reserved', reserved };
    }

    const updated = inventory
        ? await adminCatalogRepository.updateInventory(inventory.id, { stock })
        : await adminCatalogRepository.createInventory({
            productVariantId: parsedVariantId,
            stock,
            reserved: 0,
        });

    return {
        data: {
            variantId: parsedVariantId,
            sku: variant.sku,
            stock: Number(updated && updated.stock ? updated.stock : stock),
            reserved,
        },
    };
}

async function deleteCategory(categoryId) {
    const parsedId = parsePositiveInt(categoryId);
    if (!parsedId) {
        return { error: 'bad_request', message: 'categoryId invalido' };
    }

    const category = await adminCatalogRepository.findCategoryById(parsedId);
    if (!category) {
        return { error: 'not_found', message: 'Categoria no encontrada' };
    }

    const result = await sequelize.transaction((transaction) =>
        adminCatalogRepository.deleteCategoryScope(parsedId, { transaction })
    );

    if (!result) {
        return { error: 'not_found', message: 'Categoria no encontrada' };
    }

    return {
        data: {
            scope: 'category',
            categoryId: parsedId,
            deletedCategories: Number(result.deletedCategories || 0),
            deletedProducts: Number(result.deletedProducts || 0),
            deletedVariants: Number(result.deletedVariants || 0),
            deletedProductImages: Number(result.deletedProductImages || 0),
            deletedVariantImages: Number(result.deletedVariantImages || 0),
            deletedInventories: Number(result.deletedInventories || 0),
            deletedCartItems: Number(result.deletedCartItems || 0),
        },
    };
}

async function deleteProduct(productId) {
    const parsedId = parsePositiveInt(productId);
    if (!parsedId) {
        return { error: 'bad_request', message: 'productId invalido' };
    }

    const product = await adminCatalogRepository.findProductById(parsedId);
    if (!product) {
        return { error: 'not_found', message: 'Producto no encontrado' };
    }

    const result = await sequelize.transaction((transaction) =>
        adminCatalogRepository.deleteProductScope(parsedId, { transaction })
    );

    if (!result) {
        return { error: 'not_found', message: 'Producto no encontrado' };
    }

    return {
        data: {
            scope: 'product',
            productId: parsedId,
            deletedProducts: Number(result.deletedProducts || 0),
            deletedVariants: Number(result.deletedVariants || 0),
            deletedProductImages: Number(result.deletedProductImages || 0),
            deletedVariantImages: Number(result.deletedVariantImages || 0),
            deletedInventories: Number(result.deletedInventories || 0),
            deletedCartItems: Number(result.deletedCartItems || 0),
        },
    };
}

async function deleteVariant(variantId) {
    const parsedId = parsePositiveInt(variantId);
    if (!parsedId) {
        return { error: 'bad_request', message: 'variantId invalido' };
    }

    const variant = await adminCatalogRepository.findVariantById(parsedId);
    if (!variant) {
        return { error: 'not_found', message: 'Variante no encontrada' };
    }

    const result = await sequelize.transaction((transaction) =>
        adminCatalogRepository.deleteVariantScope(parsedId, { transaction })
    );

    if (!result) {
        return { error: 'not_found', message: 'Variante no encontrada' };
    }

    return {
        data: {
            scope: 'variant',
            variantId: parsedId,
            deletedVariants: Number(result.deletedVariants || 0),
            deletedVariantImages: Number(result.deletedVariantImages || 0),
            deletedInventories: Number(result.deletedInventories || 0),
            deletedCartItems: Number(result.deletedCartItems || 0),
        },
    };
}

module.exports = {
    listCategories,
    createCategory,
    listProducts,
    createProduct,
    updateProduct,
    createVariant,
    updateVariant,
    updateVariantStock,
    deleteCategory,
    deleteProduct,
    deleteVariant,
};
