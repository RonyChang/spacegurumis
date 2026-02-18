import { apiGet } from './client';

export type PaginationMeta = {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
};

export type CatalogFacetCategory = {
    slug: string;
    name: string;
    total: number;
};

export type CatalogFacetProduct = {
    slug: string;
    name: string;
    categorySlug: string | null;
    total: number;
};

export type CatalogFacetFiltersMeta = {
    selected: {
        category: string | null;
        product: string | null;
        minPrice: number | null;
        maxPrice: number | null;
    };
    available: {
        categories: CatalogFacetCategory[];
        products: CatalogFacetProduct[];
        priceRange: {
            min: number | null;
            max: number | null;
        };
    };
};

export type CatalogVariantsMeta = PaginationMeta & {
    filters?: CatalogFacetFiltersMeta;
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
    imageUrl?: string | null;
    price: number | null;
    stockAvailable: number;
    product: CatalogProductLite;
    category: CatalogCategory;
};

export type CatalogImage = {
    url: string;
    altText: string | null;
    sortOrder: number | null;
};

export type CatalogProductVariantSummary = {
    id: number;
    sku: string;
    variantName: string | null;
    price: number | null;
    stockAvailable: number;
};

export type CatalogProductDetail = {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    category: CatalogCategory;
    images: CatalogImage[];
    variants: CatalogProductVariantSummary[];
};

export type CatalogVariantDetail = CatalogVariant & {
    product: CatalogProductLite & { description: string | null };
    images?: CatalogImage[];
};

export type CatalogVariantsQuery = {
    page?: number;
    pageSize?: number;
    category?: string | null;
    product?: string | null;
    minPrice?: number | null;
    maxPrice?: number | null;
    includeFacets?: boolean;
};

function appendQueryParam(params: URLSearchParams, key: string, value: unknown) {
    if (value === null || value === undefined) {
        return;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) {
            return;
        }
        params.set(key, trimmed);
        return;
    }

    if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
            return;
        }
        params.set(key, String(value));
        return;
    }

    if (typeof value === 'boolean') {
        params.set(key, value ? 'true' : 'false');
    }
}

export function listCatalogVariants(
    pageOrQuery: number | CatalogVariantsQuery = 1,
    pageSizeArg = 9
) {
    const query = typeof pageOrQuery === 'number'
        ? { page: pageOrQuery, pageSize: pageSizeArg }
        : pageOrQuery;
    const safePage = Number.isFinite(Number(query.page)) && Number(query.page) > 0
        ? Math.floor(Number(query.page))
        : 1;
    const safePageSize = Number.isFinite(Number(query.pageSize)) && Number(query.pageSize) > 0
        ? Math.floor(Number(query.pageSize))
        : 9;

    const params = new URLSearchParams({
        page: String(safePage),
        pageSize: String(safePageSize),
    });
    appendQueryParam(params, 'category', query.category);
    appendQueryParam(params, 'product', query.product);
    appendQueryParam(params, 'minPrice', query.minPrice);
    appendQueryParam(params, 'maxPrice', query.maxPrice);
    appendQueryParam(params, 'includeFacets', query.includeFacets);

    return apiGet<CatalogVariant[], CatalogVariantsMeta>(
        `/api/v1/catalog/variants?${params.toString()}`
    );
}

export function getCatalogVariantDetail(sku: string) {
    return apiGet<CatalogVariantDetail>(`/api/v1/catalog/variants/${encodeURIComponent(sku)}`);
}

export function getCatalogProductDetail(slug: string) {
    return apiGet<CatalogProductDetail>(`/api/v1/catalog/products/${encodeURIComponent(slug)}`);
}
