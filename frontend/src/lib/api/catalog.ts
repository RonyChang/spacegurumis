import { apiGet } from './client';

export type PaginationMeta = {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
};

export type CatalogCategory = {
    id: number;
    name: string;
    slug: string;
};

export type CatalogProductLite = {
    id: number;
    name: string;
    slug: string;
};

export type CatalogVariant = {
    id: number;
    sku: string;
    variantName: string | null;
    price: number | null;
    stockAvailable: number;
    product: CatalogProductLite;
    category: CatalogCategory;
};

export type CatalogVariantDetail = CatalogVariant & {
    product: CatalogProductLite & { description: string | null };
};

export function listCatalogVariants(page: number, pageSize: number) {
    const safePage = Number.isFinite(Number(page)) && page > 0 ? Math.floor(page) : 1;
    const safePageSize =
        Number.isFinite(Number(pageSize)) && pageSize > 0 ? Math.floor(pageSize) : 9;
    return apiGet<CatalogVariant[], PaginationMeta>(
        `/api/v1/catalog/variants?page=${safePage}&pageSize=${safePageSize}`
    );
}

export function getCatalogVariantDetail(sku: string) {
    return apiGet<CatalogVariantDetail>(`/api/v1/catalog/variants/${encodeURIComponent(sku)}`);
}

