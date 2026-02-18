import React, { useMemo, useState } from 'react';
import { addCartItem as addCartItemApi } from '../../lib/api/cart';
import { ApiError } from '../../lib/api/client';
import {
    listCatalogVariants,
    type CatalogVariant,
    type CatalogVariantsMeta,
} from '../../lib/api/catalog';
import { readGuestCart, writeGuestCart } from '../../lib/cart/guestCart';
import { formatPrice, formatVariantTitle } from '../../lib/format';
import Alert from '../ui/Alert';
import Button from '../ui/Button';

const CATALOG_PAGE_SIZE = 9;

type SortMode = 'popular' | 'price-asc' | 'price-desc' | 'stock-desc';

type ShopQueryState = {
    page: number;
    category: string;
    product: string;
    minPrice: string;
    maxPrice: string;
};

export type ShopCatalogInitialData = {
    variants: CatalogVariant[];
    meta: CatalogVariantsMeta;
};

type ShopPageProps = {
    initialData?: ShopCatalogInitialData | null;
};

function imgErrorToPlaceholder(event: React.SyntheticEvent<HTMLImageElement>) {
    const img = event.currentTarget;
    if (img.dataset.fallbackApplied === '1') {
        return;
    }
    img.dataset.fallbackApplied = '1';
    img.src = '/placeholder-product.svg';
}

function buildDetailUrl(variant: CatalogVariant) {
    const slug = variant && variant.product && variant.product.slug ? String(variant.product.slug) : '';
    const sku = variant && variant.sku ? String(variant.sku) : '';
    const encodedSlug = encodeURIComponent(slug);
    const encodedSku = encodeURIComponent(sku);
    return `/products/${encodedSlug}?sku=${encodedSku}`;
}

function sortVariants(items: CatalogVariant[], sortMode: SortMode) {
    const copy = [...items];
    if (sortMode === 'price-asc') {
        copy.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    } else if (sortMode === 'price-desc') {
        copy.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    } else if (sortMode === 'stock-desc') {
        copy.sort((a, b) => (Number(b.stockAvailable) || 0) - (Number(a.stockAvailable) || 0));
    }
    return copy;
}

function parsePriceInput(value: string): number | null {
    const normalized = String(value || '').trim();
    if (!normalized) {
        return null;
    }

    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed < 0) {
        return null;
    }

    return Number(parsed.toFixed(2));
}

function normalizePage(value: unknown, fallback = 1) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 1) {
        return fallback;
    }

    return Math.floor(parsed);
}

function normalizeMeta(meta: CatalogVariantsMeta | undefined, fallbackPage = 1): CatalogVariantsMeta {
    const totalPages = Number(meta && meta.totalPages);
    const normalizedTotalPages = Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 1;

    return {
        total: Number(meta && meta.total) || 0,
        page: normalizePage(meta && meta.page, fallbackPage),
        pageSize: Number(meta && meta.pageSize) || CATALOG_PAGE_SIZE,
        totalPages: normalizedTotalPages,
        filters: meta && meta.filters ? meta.filters : undefined,
    };
}

function toQueryState(meta: CatalogVariantsMeta | undefined): ShopQueryState {
    const selected = meta && meta.filters ? meta.filters.selected : null;
    return {
        page: normalizePage(meta && meta.page, 1),
        category: selected && selected.category ? selected.category : '',
        product: selected && selected.product ? selected.product : '',
        minPrice: selected && typeof selected.minPrice === 'number' ? String(selected.minPrice) : '',
        maxPrice: selected && typeof selected.maxPrice === 'number' ? String(selected.maxPrice) : '',
    };
}

function syncBrowserQuery(state: ShopQueryState) {
    if (typeof window === 'undefined') {
        return;
    }

    const params = new URLSearchParams();
    if (state.page > 1) {
        params.set('page', String(state.page));
    }
    if (state.category) {
        params.set('category', state.category);
    }
    if (state.product) {
        params.set('product', state.product);
    }
    if (state.minPrice) {
        params.set('minPrice', state.minPrice);
    }
    if (state.maxPrice) {
        params.set('maxPrice', state.maxPrice);
    }

    const next = params.toString() ? `/shop?${params.toString()}` : '/shop';
    window.history.replaceState({}, '', next);
}

export default function ShopPage({ initialData = null }: ShopPageProps) {
    const initialCatalog = initialData && Array.isArray(initialData.variants)
        ? initialData
        : null;

    const initialMeta = normalizeMeta(initialCatalog ? initialCatalog.meta : undefined, 1);
    const initialQuery = toQueryState(initialCatalog ? initialCatalog.meta : undefined);

    const [status, setStatus] = useState<'idle' | 'loading'>('idle');
    const [error, setError] = useState('');
    const [variants, setVariants] = useState<CatalogVariant[]>(initialCatalog ? initialCatalog.variants : []);
    const [meta, setMeta] = useState<CatalogVariantsMeta>(initialMeta);
    const [query, setQuery] = useState<ShopQueryState>(initialQuery);
    const [message, setMessage] = useState('');
    const [messageTone, setMessageTone] = useState<'info' | 'success' | 'error'>('info');
    const [sortMode, setSortMode] = useState<SortMode>('popular');

    const sortedVariants = useMemo(() => sortVariants(variants, sortMode), [sortMode, variants]);

    const facetCategories = useMemo(() => {
        const available = meta.filters && meta.filters.available ? meta.filters.available.categories : [];
        return Array.isArray(available) ? available : [];
    }, [meta.filters]);

    const facetProducts = useMemo(() => {
        const available = meta.filters && meta.filters.available ? meta.filters.available.products : [];
        const list = Array.isArray(available) ? available : [];
        if (!query.category) {
            return list;
        }

        return list.filter((item) => item.categorySlug === query.category);
    }, [meta.filters, query.category]);

    const priceBounds = useMemo(() => {
        const min = meta.filters && meta.filters.available && meta.filters.available.priceRange
            ? meta.filters.available.priceRange.min
            : null;
        const max = meta.filters && meta.filters.available && meta.filters.available.priceRange
            ? meta.filters.available.priceRange.max
            : null;

        const normalizedMin = typeof min === 'number' ? min : 0;
        const normalizedMax = typeof max === 'number' ? max : normalizedMin;

        return {
            min: normalizedMin,
            max: normalizedMax >= normalizedMin ? normalizedMax : normalizedMin,
        };
    }, [meta.filters]);

    async function loadVariants(nextState: Partial<ShopQueryState>, options: { resetPage?: boolean } = {}) {
        const mergedState: ShopQueryState = {
            ...query,
            ...nextState,
            page: options.resetPage
                ? 1
                : normalizePage(nextState.page !== undefined ? nextState.page : query.page, query.page),
        };

        const minPrice = parsePriceInput(mergedState.minPrice);
        const maxPrice = parsePriceInput(mergedState.maxPrice);

        setStatus('loading');
        setError('');
        try {
            const res = await listCatalogVariants({
                page: mergedState.page,
                pageSize: CATALOG_PAGE_SIZE,
                category: mergedState.category || null,
                product: mergedState.product || null,
                minPrice,
                maxPrice,
                includeFacets: true,
            });

            const nextVariants = Array.isArray(res.data) ? res.data : [];
            const nextMeta = normalizeMeta(res.meta, mergedState.page);
            const selected = nextMeta.filters ? nextMeta.filters.selected : null;
            const nextQueryState: ShopQueryState = {
                page: normalizePage(nextMeta.page, mergedState.page),
                category: selected && selected.category ? selected.category : mergedState.category,
                product: selected && selected.product ? selected.product : mergedState.product,
                minPrice: selected && typeof selected.minPrice === 'number'
                    ? String(selected.minPrice)
                    : (minPrice === null ? '' : String(minPrice)),
                maxPrice: selected && typeof selected.maxPrice === 'number'
                    ? String(selected.maxPrice)
                    : (maxPrice === null ? '' : String(maxPrice)),
            };

            setVariants(nextVariants);
            setMeta(nextMeta);
            setQuery(nextQueryState);
            syncBrowserQuery(nextQueryState);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo cargar el catalogo.');
        } finally {
            setStatus('idle');
        }
    }

    async function handleAddToCart(variant: CatalogVariant) {
        const sku = variant && variant.sku ? String(variant.sku) : '';
        if (!sku) {
            return;
        }

        setMessage('');

        try {
            await addCartItemApi(sku, 1);
            setMessageTone('success');
            setMessage('Producto agregado al carrito.');
        } catch (err) {
            if (err instanceof ApiError && err.status === 401) {
                const current = readGuestCart();
                const existing = current.find((item) => item.sku === sku);
                if (existing) {
                    existing.quantity += 1;
                } else {
                    current.push({
                        sku,
                        productName: variant.product && variant.product.name ? variant.product.name : 'Producto',
                        variantName: variant.variantName || null,
                        price: Number(variant.price) || 0,
                        quantity: 1,
                    });
                }

                writeGuestCart(current);
                setMessageTone('success');
                setMessage('Producto agregado al carrito.');
                return;
            }

            setMessageTone('error');
            setMessage(err instanceof Error ? err.message : 'No se pudo agregar al carrito.');
        }
    }

    React.useEffect(() => {
        if (!initialCatalog) {
            loadVariants({ page: 1 });
        }
    }, [initialCatalog]);

    return (
        <section className="surface page storefront-shell shop-shell">
            <header className="shop-shell__header">
                <div>
                    <p className="section-eyebrow">Explora la galaxia</p>
                    <h1>Adopta un Alien</h1>
                    <p className="muted">Compañeros tejidos a mano listos para un nuevo hogar.</p>
                </div>
                <label className="shop-shell__sort">
                    <span>Ordenar por</span>
                    <select
                        value={sortMode}
                        onChange={(event) => setSortMode(event.target.value as SortMode)}
                        className="field__input"
                    >
                        <option value="popular">Mas popular</option>
                        <option value="price-asc">Precio menor a mayor</option>
                        <option value="price-desc">Precio mayor a menor</option>
                        <option value="stock-desc">Mayor stock</option>
                    </select>
                </label>
            </header>

            {message ? <Alert tone={messageTone}>{message}</Alert> : null}
            {error ? <Alert tone="error">{error}</Alert> : null}
            {status === 'loading' ? <p className="status">Cargando catalogo...</p> : null}

            <div className="shop-shell__layout">
                <aside className="panel-card shop-filters" aria-label="Filtros de tienda">
                    <h2>Categoría</h2>
                    <button
                        type="button"
                        className={`chip ${query.category === '' ? 'chip--active' : ''}`}
                        onClick={() => loadVariants({ category: '', product: '' }, { resetPage: true })}
                    >
                        Todas
                    </button>
                    {facetCategories.map((category) => (
                        <button
                            key={category.slug}
                            type="button"
                            className={`chip ${query.category === category.slug ? 'chip--active' : ''}`}
                            onClick={() => loadVariants({ category: category.slug, product: '' }, { resetPage: true })}
                        >
                            {category.name} ({category.total})
                        </button>
                    ))}

                    <h2>Producto</h2>
                    <label className="field shop-filters__field">
                        <span className="field__label">Selecciona un producto</span>
                        <select
                            className="field__input"
                            value={query.product}
                            onChange={(event) => loadVariants({ product: event.target.value }, { resetPage: true })}
                        >
                            <option value="">Todos</option>
                            {facetProducts.map((product) => (
                                <option key={product.slug} value={product.slug}>
                                    {product.name} ({product.total})
                                </option>
                            ))}
                        </select>
                    </label>

                    <h2>Rango de precio</h2>
                    <div className="shop-filters__price">
                        <label className="field shop-filters__field">
                            <span className="field__label">Mínimo (S/)</span>
                            <input
                                className="field__input"
                                type="number"
                                min={priceBounds.min}
                                max={priceBounds.max}
                                step="0.5"
                                value={query.minPrice}
                                onChange={(event) => setQuery((prev) => ({ ...prev, minPrice: event.target.value }))}
                            />
                        </label>
                        <label className="field shop-filters__field">
                            <span className="field__label">Máximo (S/)</span>
                            <input
                                className="field__input"
                                type="number"
                                min={priceBounds.min}
                                max={priceBounds.max}
                                step="0.5"
                                value={query.maxPrice}
                                onChange={(event) => setQuery((prev) => ({ ...prev, maxPrice: event.target.value }))}
                            />
                        </label>
                    </div>
                    <div className="shop-filters__price-range">
                        <input
                            type="range"
                            min={priceBounds.min}
                            max={priceBounds.max || priceBounds.min}
                            step="0.5"
                            value={query.minPrice || String(priceBounds.min)}
                            onChange={(event) => setQuery((prev) => ({ ...prev, minPrice: event.target.value }))}
                        />
                        <input
                            type="range"
                            min={priceBounds.min}
                            max={priceBounds.max || priceBounds.min}
                            step="0.5"
                            value={query.maxPrice || String(priceBounds.max)}
                            onChange={(event) => setQuery((prev) => ({ ...prev, maxPrice: event.target.value }))}
                        />
                    </div>
                    <div className="shop-filters__actions">
                        <Button type="button" variant="primary" onClick={() => loadVariants({}, { resetPage: true })}>
                            Aplicar precio
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                const cleared: ShopQueryState = {
                                    ...query,
                                    category: '',
                                    product: '',
                                    minPrice: '',
                                    maxPrice: '',
                                };
                                setQuery(cleared);
                                void loadVariants(cleared, { resetPage: true });
                            }}
                        >
                            Limpiar filtros
                        </Button>
                    </div>
                </aside>

                <div className="shop-shell__products">
                    {status === 'idle' && !sortedVariants.length ? (
                        <p className="status">No hay productos para este filtro.</p>
                    ) : null}

                    <div className="grid grid--cards catalog">
                        {sortedVariants.map((variant, index) => (
                            <article className="card storefront-card" key={variant.sku}>
                                <div className="card__thumb storefront-card__thumb">
                                    <img
                                        src={variant.imageUrl || '/placeholder-product.svg'}
                                        alt={formatVariantTitle(variant)}
                                        loading={index < 3 ? 'eager' : 'lazy'}
                                        decoding="async"
                                        onError={imgErrorToPlaceholder}
                                    />
                                </div>
                                <p className="storefront-card__category">{variant.category.name}</p>
                                <h3 className="card__title storefront-card__title">{formatVariantTitle(variant)}</h3>
                                <p className="card__meta storefront-card__meta">SKU: {variant.sku}</p>
                                <p className="card__price storefront-card__price">{formatPrice(variant.price)}</p>
                                <p className="card__meta">Stock disponible: {variant.stockAvailable}</p>

                                <div className="card__actions storefront-card__actions">
                                    <a className="button button--ghost" href={buildDetailUrl(variant)} data-nav-prefetch>
                                        Ver detalle
                                    </a>
                                    <Button type="button" variant="primary" onClick={() => handleAddToCart(variant)}>
                                        Agregar
                                    </Button>
                                </div>
                            </article>
                        ))}
                    </div>

                    {meta.totalPages > 1 ? (
                        <div className="pagination">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => loadVariants({ page: query.page - 1 })}
                                disabled={query.page <= 1 || status === 'loading'}
                            >
                                Anterior
                            </Button>
                            <span className="pagination__info">
                                Pagina {query.page} de {meta.totalPages}
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => loadVariants({ page: query.page + 1 })}
                                disabled={query.page >= meta.totalPages || status === 'loading'}
                            >
                                Siguiente
                            </Button>
                        </div>
                    ) : null}
                </div>
            </div>
        </section>
    );
}
