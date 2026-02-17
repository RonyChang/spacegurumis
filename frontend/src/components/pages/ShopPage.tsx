import React, { useMemo, useState } from 'react';
import { addCartItem as addCartItemApi } from '../../lib/api/cart';
import { ApiError } from '../../lib/api/client';
import { listCatalogVariants, type CatalogVariant } from '../../lib/api/catalog';
import { readGuestCart, writeGuestCart } from '../../lib/cart/guestCart';
import { formatPrice, formatVariantTitle } from '../../lib/format';
import Alert from '../ui/Alert';
import Button from '../ui/Button';

const CATALOG_PAGE_SIZE = 9;

type SortMode = 'popular' | 'price-asc' | 'price-desc' | 'stock-desc';

export type ShopCatalogInitialData = {
    variants: CatalogVariant[];
    page: number;
    totalPages: number;
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

export default function ShopPage({ initialData = null }: ShopPageProps) {
    const initialCatalog = initialData && Array.isArray(initialData.variants)
        ? initialData
        : null;

    const [status, setStatus] = useState<'idle' | 'loading'>('idle');
    const [error, setError] = useState('');
    const [variants, setVariants] = useState<CatalogVariant[]>(initialCatalog ? initialCatalog.variants : []);
    const [page, setPage] = useState(initialCatalog ? Number(initialCatalog.page) || 1 : 1);
    const [totalPages, setTotalPages] = useState(initialCatalog ? Number(initialCatalog.totalPages) || 1 : 1);
    const [message, setMessage] = useState('');
    const [messageTone, setMessageTone] = useState<'info' | 'success' | 'error'>('info');
    const [sortMode, setSortMode] = useState<SortMode>('popular');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    const categoryCounts = useMemo(() => {
        const counts = new Map<string, { label: string; total: number }>();
        for (const variant of variants) {
            const slug = String(variant.category?.slug || 'misc');
            const label = String(variant.category?.name || 'Otros');
            const previous = counts.get(slug);
            counts.set(slug, {
                label,
                total: (previous ? previous.total : 0) + 1,
            });
        }
        return Array.from(counts.entries())
            .map(([slug, info]) => ({ slug, ...info }))
            .sort((a, b) => b.total - a.total);
    }, [variants]);

    const visibleVariants = useMemo(() => {
        const filtered = selectedCategory === 'all'
            ? variants
            : variants.filter((variant) => String(variant.category?.slug || '') === selectedCategory);
        return sortVariants(filtered, sortMode);
    }, [selectedCategory, sortMode, variants]);

    async function loadVariants(nextPage: number) {
        setStatus('loading');
        setError('');
        try {
            const res = await listCatalogVariants(nextPage, CATALOG_PAGE_SIZE);
            const nextVariants = Array.isArray(res.data) ? res.data : [];
            setVariants(nextVariants);
            setSelectedCategory('all');

            const meta = res.meta || { page: nextPage, totalPages: 1 };
            setPage(Number.isFinite(Number(meta.page)) ? Number(meta.page) : nextPage);
            setTotalPages(
                Number.isFinite(Number(meta.totalPages)) && Number(meta.totalPages) > 0
                    ? Number(meta.totalPages)
                    : 1
            );
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
            loadVariants(1);
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
                    <h2>Especies</h2>
                    <button
                        type="button"
                        className={`chip ${selectedCategory === 'all' ? 'chip--active' : ''}`}
                        onClick={() => setSelectedCategory('all')}
                    >
                        Todos ({variants.length})
                    </button>
                    {categoryCounts.map((category) => (
                        <button
                            key={category.slug}
                            type="button"
                            className={`chip ${selectedCategory === category.slug ? 'chip--active' : ''}`}
                            onClick={() => setSelectedCategory(category.slug)}
                        >
                            {category.label} ({category.total})
                        </button>
                    ))}
                </aside>

                <div className="shop-shell__products">
                    {status === 'idle' && !visibleVariants.length ? (
                        <p className="status">No hay productos para este filtro.</p>
                    ) : null}

                    <div className="grid grid--cards catalog">
                        {visibleVariants.map((variant, index) => (
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

                    {totalPages > 1 ? (
                        <div className="pagination">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => loadVariants(page - 1)}
                                disabled={page <= 1 || status === 'loading'}
                            >
                                Anterior
                            </Button>
                            <span className="pagination__info">
                                Pagina {page} de {totalPages}
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => loadVariants(page + 1)}
                                disabled={page >= totalPages || status === 'loading'}
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
