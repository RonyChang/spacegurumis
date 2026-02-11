import { apiDelete, apiGet, apiPatch, apiPost } from './client';

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

export function listAdminUsers() {
    return apiGet<AdminUser[]>('/api/v1/admin/users');
}

export function createAdminUser(payload: CreateAdminUserPayload) {
    return apiPost<{ action: 'created' | 'promoted'; user: AdminUser }>('/api/v1/admin/users', payload);
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

export function deleteAdminCatalogProduct(productId: number) {
    return apiDelete<AdminCatalogDeleteResult>(`/api/v1/admin/catalog/products/${productId}`);
}

export function deleteAdminCatalogVariant(variantId: number) {
    return apiDelete<AdminCatalogDeleteResult>(`/api/v1/admin/catalog/variants/${variantId}`);
}

export function listAdminDiscounts() {
    return apiGet<AdminDiscount[]>('/api/v1/admin/discounts');
}

export function createAdminDiscount(payload: CreateAdminDiscountPayload) {
    return apiPost<AdminDiscount>('/api/v1/admin/discounts', payload);
}

export function presignVariantImage(variantId: number, payload: { contentType: string; byteSize: number }) {
    return apiPost<{ uploadUrl: string; imageKey: string; expiresIn: number }>(
        `/api/v1/admin/variants/${variantId}/images/presign`,
        payload
    );
}

export function registerVariantImage(variantId: number, payload: RegisterVariantImagePayload) {
    return apiPost<AdminVariantImage>(`/api/v1/admin/variants/${variantId}/images`, payload);
}

export function listVariantImages(variantId: number) {
    return apiGet<AdminVariantImage[]>(`/api/v1/admin/variants/${variantId}/images`);
}

export function updateVariantImage(
    variantId: number,
    imageId: number,
    payload: { altText?: string | null; sortOrder?: number }
) {
    return apiPatch<AdminVariantImage>(`/api/v1/admin/variants/${variantId}/images/${imageId}`, payload);
}

export function deleteVariantImage(variantId: number, imageId: number) {
    return apiDelete<{ deleted: true }>(`/api/v1/admin/variants/${variantId}/images/${imageId}`);
}
