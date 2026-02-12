import { apiDelete, apiGet, apiPatch, apiPost } from './client';

function withQuery(path: string, query: Record<string, unknown> = {}) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') {
            return;
        }
        params.set(key, String(value));
    });

    const text = params.toString();
    if (!text) {
        return path;
    }

    return `${path}?${text}`;
}

export type AdminUser = {
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
    isActive: boolean;
    emailVerifiedAt: string | null;
    createdAt: string | null;
    updatedAt: string | null;
};

export type AdminCatalogCategory = {
    id: number;
    name: string;
    slug: string;
    description?: string | null;
    isActive: boolean;
};

export type AdminCatalogVariant = {
    id: number;
    sku: string;
    variantName: string | null;
    price: number | null;
    weightGrams: number | null;
    sizeLabel: string | null;
    stock: number;
    reserved: number;
};

export type AdminCatalogProduct = {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    isActive: boolean;
    category: AdminCatalogCategory | null;
    variants: AdminCatalogVariant[];
};

export type CreateAdminUserPayload = {
    email: string;
    password?: string;
    firstName?: string;
    lastName?: string;
};

export type CreateProductPayload = {
    categoryId?: number | null;
    name: string;
    slug: string;
    description?: string | null;
    isActive?: boolean;
    sku: string;
    variantName?: string | null;
    price: number;
    initialStock: number;
    weightGrams?: number | null;
    sizeLabel?: string | null;
};

export type CreateCategoryPayload = {
    name: string;
    slug: string;
    description?: string | null;
    isActive?: boolean;
};

export type UpdateCategoryPayload = {
    name?: string;
    slug?: string;
    description?: string | null;
    isActive?: boolean;
};

export type UpdateProductPayload = {
    categoryId?: number | null;
    name?: string;
    slug?: string;
    description?: string | null;
    isActive?: boolean;
};

export type CreateVariantPayload = {
    sku: string;
    variantName?: string | null;
    price: number;
    initialStock?: number;
    weightGrams?: number | null;
    sizeLabel?: string | null;
};

export type UpdateVariantPayload = {
    sku?: string;
    variantName?: string | null;
    price?: number;
    weightGrams?: number | null;
    sizeLabel?: string | null;
};

export type RegisterVariantImagePayload = {
    imageKey: string;
    contentType: string;
    byteSize: number;
    altText?: string | null;
    sortOrder?: number;
};

export type RegisterScopedImagePayload = {
    imageKey: string;
    contentType: string;
    byteSize: number;
    altText?: string | null;
    sortOrder?: number;
};

export type AdminVariantImage = {
    id: number;
    productVariantId: number;
    imageKey: string;
    publicUrl: string;
    contentType: string;
    byteSize: number;
    altText: string | null;
    sortOrder: number;
};

export type AdminScopedCategoryImage = {
    id: number;
    scope: 'category';
    categoryId: number;
    imageKey: string;
    publicUrl: string;
    contentType: string;
    byteSize: number;
    altText: string | null;
    sortOrder: number;
};

export type AdminScopedProductImage = {
    id: number;
    scope: 'product';
    productId: number;
    imageKey: string;
    publicUrl: string;
    contentType: string;
    byteSize: number;
    altText: string | null;
    sortOrder: number;
};

export type AdminCatalogDeleteResult = {
    scope: 'category' | 'product' | 'variant';
    categoryId?: number;
    productId?: number;
    variantId?: number;
    deletedCategories?: number;
    deletedProducts?: number;
    deletedVariants?: number;
    deletedProductImages?: number;
    deletedVariantImages?: number;
    deletedInventories?: number;
    deletedCartItems?: number;
};

export type AdminDeleteContext = {
    categoryId?: number | null;
    productId?: number | null;
};

export type AdminDiscount = {
    id: number;
    code: string;
    percentage: number;
    isActive: boolean;
    startsAt: string | null;
    expiresAt: string | null;
    maxUses: number | null;
    usedCount: number;
    minSubtotal: number | null;
};

export type CreateAdminDiscountPayload = {
    code: string;
    percentage: number;
    isActive?: boolean;
    startsAt?: string | null;
    expiresAt?: string | null;
    maxUses?: number | null;
    minSubtotal?: number | null;
};

export type UpdateAdminDiscountPayload = {
    code?: string;
    percentage?: number;
    isActive?: boolean;
    startsAt?: string | null;
    expiresAt?: string | null;
    maxUses?: number | null;
    minSubtotal?: number | null;
};

export type AdminPresignResponse = {
    uploadUrl: string;
    imageKey: string;
    publicUrl: string;
    expiresInSeconds: number;
    headers: Record<string, string>;
};

export function listAdminUsers() {
    return apiGet<AdminUser[]>('/api/v1/admin/users');
}

export function createAdminUser(payload: CreateAdminUserPayload) {
    return apiPost<{ action: 'created' | 'promoted'; user: AdminUser }>('/api/v1/admin/users', payload);
}

export function removeAdminUser(userId: number) {
    return apiDelete<{ action: 'demoted'; user: AdminUser }>(`/api/v1/admin/users/${userId}`);
}

export function listAdminCatalogCategories() {
    return apiGet<AdminCatalogCategory[]>('/api/v1/admin/catalog/categories');
}

export function listAdminCatalogProducts() {
    return apiGet<AdminCatalogProduct[]>('/api/v1/admin/catalog/products');
}

export function createAdminCatalogCategory(payload: CreateCategoryPayload) {
    return apiPost<AdminCatalogCategory>('/api/v1/admin/catalog/categories', payload);
}

export function updateAdminCatalogCategory(categoryId: number, payload: UpdateCategoryPayload) {
    return apiPatch<AdminCatalogCategory>(`/api/v1/admin/catalog/categories/${categoryId}`, payload);
}

export function createAdminCatalogProduct(payload: CreateProductPayload) {
    return apiPost('/api/v1/admin/catalog/products', payload);
}

export function updateAdminCatalogProduct(productId: number, payload: UpdateProductPayload) {
    return apiPatch(`/api/v1/admin/catalog/products/${productId}`, payload);
}

export function createAdminCatalogVariant(productId: number, payload: CreateVariantPayload) {
    return apiPost(`/api/v1/admin/catalog/products/${productId}/variants`, payload);
}

export function updateAdminCatalogVariant(variantId: number, payload: UpdateVariantPayload) {
    return apiPatch(`/api/v1/admin/catalog/variants/${variantId}`, payload);
}

export function updateAdminCatalogVariantStock(variantId: number, stock: number) {
    return apiPatch(`/api/v1/admin/catalog/variants/${variantId}/stock`, { stock });
}

export function deleteAdminCatalogCategory(categoryId: number) {
    return apiDelete<AdminCatalogDeleteResult>(`/api/v1/admin/catalog/categories/${categoryId}`);
}

export function deleteAdminCatalogProduct(productId: number, context: AdminDeleteContext = {}) {
    return apiDelete<AdminCatalogDeleteResult>(
        withQuery(`/api/v1/admin/catalog/products/${productId}`, {
            categoryId: context.categoryId,
        })
    );
}

export function deleteAdminCatalogVariant(variantId: number, context: AdminDeleteContext = {}) {
    return apiDelete<AdminCatalogDeleteResult>(
        withQuery(`/api/v1/admin/catalog/variants/${variantId}`, {
            categoryId: context.categoryId,
            productId: context.productId,
        })
    );
}

export function listAdminDiscounts() {
    return apiGet<AdminDiscount[]>('/api/v1/admin/discounts');
}

export function createAdminDiscount(payload: CreateAdminDiscountPayload) {
    return apiPost<AdminDiscount>('/api/v1/admin/discounts', payload);
}

export function updateAdminDiscount(discountId: number, payload: UpdateAdminDiscountPayload) {
    return apiPatch<AdminDiscount>(`/api/v1/admin/discounts/${discountId}`, payload);
}

export function deleteAdminDiscount(discountId: number) {
    return apiDelete<{ deleted: true }>(`/api/v1/admin/discounts/${discountId}`);
}

export function presignVariantImage(
    variantId: number,
    payload: { contentType: string; byteSize: number },
    context: AdminDeleteContext = {}
) {
    return apiPost<AdminPresignResponse>(
        withQuery(`/api/v1/admin/variants/${variantId}/images/presign`, {
            categoryId: context.categoryId,
            productId: context.productId,
        }),
        payload
    );
}

export function registerVariantImage(
    variantId: number,
    payload: RegisterVariantImagePayload,
    context: AdminDeleteContext = {}
) {
    return apiPost<AdminVariantImage>(
        withQuery(`/api/v1/admin/variants/${variantId}/images`, {
            categoryId: context.categoryId,
            productId: context.productId,
        }),
        payload
    );
}

export function listVariantImages(variantId: number, context: AdminDeleteContext = {}) {
    return apiGet<AdminVariantImage[]>(
        withQuery(`/api/v1/admin/variants/${variantId}/images`, {
            categoryId: context.categoryId,
            productId: context.productId,
        })
    );
}

export function updateVariantImage(
    variantId: number,
    imageId: number,
    payload: { altText?: string | null; sortOrder?: number },
    context: AdminDeleteContext = {}
) {
    return apiPatch<AdminVariantImage>(
        withQuery(`/api/v1/admin/variants/${variantId}/images/${imageId}`, {
            categoryId: context.categoryId,
            productId: context.productId,
        }),
        payload
    );
}

export function deleteVariantImage(variantId: number, imageId: number, context: AdminDeleteContext = {}) {
    return apiDelete<{ deleted: true }>(
        withQuery(`/api/v1/admin/variants/${variantId}/images/${imageId}`, {
            categoryId: context.categoryId,
            productId: context.productId,
        })
    );
}

export function presignCategoryImage(categoryId: number, payload: { contentType: string; byteSize: number }) {
    return apiPost<AdminPresignResponse>(`/api/v1/admin/categories/${categoryId}/images/presign`, payload);
}

export function registerCategoryImage(categoryId: number, payload: RegisterScopedImagePayload) {
    return apiPost<AdminScopedCategoryImage>(`/api/v1/admin/categories/${categoryId}/images`, payload);
}

export function listCategoryImages(categoryId: number) {
    return apiGet<AdminScopedCategoryImage[]>(`/api/v1/admin/categories/${categoryId}/images`);
}

export function updateCategoryImage(
    categoryId: number,
    imageId: number,
    payload: { altText?: string | null; sortOrder?: number }
) {
    return apiPatch<AdminScopedCategoryImage>(`/api/v1/admin/categories/${categoryId}/images/${imageId}`, payload);
}

export function deleteCategoryImage(categoryId: number, imageId: number) {
    return apiDelete<{ deleted: true }>(`/api/v1/admin/categories/${categoryId}/images/${imageId}`);
}

export function presignProductImage(
    productId: number,
    payload: { contentType: string; byteSize: number },
    context: Pick<AdminDeleteContext, 'categoryId'> = {}
) {
    return apiPost<AdminPresignResponse>(
        withQuery(`/api/v1/admin/products/${productId}/images/presign`, {
            categoryId: context.categoryId,
        }),
        payload
    );
}

export function registerProductImage(
    productId: number,
    payload: RegisterScopedImagePayload,
    context: Pick<AdminDeleteContext, 'categoryId'> = {}
) {
    return apiPost<AdminScopedProductImage>(
        withQuery(`/api/v1/admin/products/${productId}/images`, {
            categoryId: context.categoryId,
        }),
        payload
    );
}

export function listProductImages(productId: number, context: Pick<AdminDeleteContext, 'categoryId'> = {}) {
    return apiGet<AdminScopedProductImage[]>(
        withQuery(`/api/v1/admin/products/${productId}/images`, {
            categoryId: context.categoryId,
        })
    );
}

export function updateProductImage(
    productId: number,
    imageId: number,
    payload: { altText?: string | null; sortOrder?: number },
    context: Pick<AdminDeleteContext, 'categoryId'> = {}
) {
    return apiPatch<AdminScopedProductImage>(
        withQuery(`/api/v1/admin/products/${productId}/images/${imageId}`, {
            categoryId: context.categoryId,
        }),
        payload
    );
}

export function deleteProductImage(
    productId: number,
    imageId: number,
    context: Pick<AdminDeleteContext, 'categoryId'> = {}
) {
    return apiDelete<{ deleted: true }>(
        withQuery(`/api/v1/admin/products/${productId}/images/${imageId}`, {
            categoryId: context.categoryId,
        })
    );
}
